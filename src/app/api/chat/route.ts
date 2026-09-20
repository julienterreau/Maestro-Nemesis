import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { DEFAULT_MODEL, isModelAllowed } from "@/lib/models";
import { getOpenRouter } from "@/lib/openrouter";

export const maxDuration = 30;

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

export async function GET() {
  return Response.json({
    configured: Boolean(getApiKey()),
  });
}

export async function POST(request: Request) {
  if (!getApiKey()) {
    return Response.json(
      {
        error:
          "Ajoutez OPENROUTER_API_KEY dans le fichier .env.local puis relancez le serveur.",
      },
      { status: 500 },
    );
  }

  let body: { messages?: UIMessage[]; model?: string };

  try {
    body = (await request.json()) as { messages?: UIMessage[]; model?: string };
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const modelId =
    typeof body.model === "string" && isModelAllowed(body.model)
      ? body.model
      : DEFAULT_MODEL;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "Aucun message à envoyer." }, { status: 400 });
  }

  const openrouter = getOpenRouter(modelId);

  const result = streamText({
    model: openrouter.chat(modelId),
    messages: await convertToModelMessages(body.messages),
    abortSignal: request.signal,
    maxOutputTokens: 8192,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        error instanceof Error
          ? error.message
          : "Impossible d’obtenir une réponse OpenRouter.",
    }),
  });
}
