import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type FileUIPart,
  type UIMessage,
} from "ai";
import { getRequiredAdmin } from "@/lib/auth-user";
import { attachmentIdFromUrl, loadAttachmentBytes } from "@/lib/files";
import { resolveModelForMessages } from "@/lib/models";
import { getOpenRouterCatalog } from "@/lib/openrouter-catalog";
import { getOpenRouter } from "@/lib/openrouter";
import { parseRouterPlugins } from "@/lib/openrouter-plugins";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

export async function GET() {
  const session = await getRequiredAdmin();
  if (!session) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  return Response.json({
    configured: Boolean(getApiKey()),
  });
}

async function hydrateFileParts(messages: UIMessage[]) {
  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      parts: await Promise.all(
        message.parts.map(async (part) => {
          if (part.type !== "file") return part;
          const filePart = part as FileUIPart;
          const id = attachmentIdFromUrl(filePart.url);
          if (!id) return filePart;
          const canHydrate =
            /^(image|audio|video)\//.test(filePart.mediaType) ||
            filePart.mediaType === "application/pdf";
          if (!canHydrate) return filePart;

          const attachment = await prisma.attachment.findUnique({ where: { id } });
          if (!attachment) return filePart;
          try {
            const bytes = await loadAttachmentBytes(attachment);
            return {
              ...filePart,
              url: `data:${attachment.mimeType};base64,${bytes.toString("base64")}`,
            };
          } catch {
            return filePart;
          }
        }),
      ),
    })),
  );
}

export async function POST(request: Request) {
  const session = await getRequiredAdmin();
  if (!session) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!getApiKey()) {
    return Response.json(
      {
        error:
          "Ajoutez OPENROUTER_API_KEY dans le fichier .env.local puis relancez le serveur.",
      },
      { status: 500 },
    );
  }

  let body: { messages?: UIMessage[]; model?: string; plugins?: unknown };

  try {
    body = (await request.json()) as { messages?: UIMessage[]; model?: string };
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "Aucun message à envoyer." }, { status: 400 });
  }

  const messages = await hydrateFileParts(body.messages);
  const catalog = await getOpenRouterCatalog();
  const modelId = resolveModelForMessages(body.model ?? "", messages, catalog);
  const plugins = parseRouterPlugins(body.plugins);
  const openrouter = getOpenRouter(modelId, plugins);

  const result = streamText({
    model: openrouter.chat(modelId),
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    maxOutputTokens: 8192,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => publicChatError(error),
    }),
  });
}

function publicChatError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/image input/i.test(message)) {
    return "Ce modèle ne lit pas les images. Passez sur GPT-4o, Claude ou Gemini.";
  }
  if (/audio input/i.test(message)) {
    return "Ce modèle ne lit pas l’audio. Passez sur Gemini ou GPT-4o.";
  }
  if (/video input/i.test(message)) {
    return "Ce modèle ne lit pas la vidéo. Passez sur Gemini 2.5 Flash.";
  }
  if (/pdf|document/i.test(message) && /support|input|file/i.test(message)) {
    return "Ce modèle ne lit pas les PDF. Passez sur Gemini, Claude ou GPT-4o.";
  }
  if (/DEPLOYMENT_NOT_FOUND|deployment could not be found/i.test(message)) {
    return "Le fichier n’est plus accessible depuis ce déploiement Vercel. Renvoie l’image.";
  }
  return message || "Impossible d’obtenir une réponse OpenRouter.";
}
