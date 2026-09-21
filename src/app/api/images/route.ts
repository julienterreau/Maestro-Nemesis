import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { openRouterHeaders, publicAudioError } from "@/lib/audio";
import { createAttachmentRecord, fileUrl } from "@/lib/files";
import { IMAGE_GEN_MODEL } from "@/lib/models";
import { imageSchema } from "@/lib/validations";

export const maxDuration = 60;

const IMAGE_MODELS = [
  IMAGE_GEN_MODEL,
  "google/gemini-3.1-flash-lite-image",
  "google/gemini-2.5-flash-image",
] as const;

function extractImage(json: unknown): { bytes: Buffer; mimeType: string } | null {
  const data = json as {
    data?: Array<{ b64_json?: string; url?: string; media_type?: string }>;
    images?: Array<{ b64_json?: string; url?: string; image_url?: { url?: string } }>;
    choices?: Array<{
      message?: {
        images?: Array<{ image_url?: { url?: string } }>;
        content?: unknown;
      };
    }>;
  };

  const candidates: Array<{
    b64_json?: string;
    url?: string;
    media_type?: string;
    image_url?: { url?: string };
  }> = [
    ...(data.data ?? []),
    ...(data.images ?? []),
    ...(data.choices?.[0]?.message?.images ?? []),
  ];

  for (const item of candidates) {
    if (typeof item.b64_json === "string" && item.b64_json.length > 80) {
      return {
        bytes: Buffer.from(item.b64_json, "base64"),
        mimeType: item.media_type ?? "image/png",
      };
    }
    const url = item.url ?? item.image_url?.url;
    if (typeof url === "string") {
      const match = url.match(
        /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/i,
      );
      if (match) {
        return { bytes: Buffer.from(match[2], "base64"), mimeType: match[1] };
      }
    }
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    const match = content.match(
      /data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/i,
    );
    if (match) {
      return { bytes: Buffer.from(match[2], "base64"), mimeType: match[1] };
    }
  }

  return null;
}

function errorFromJson(json: unknown, fallback: string) {
  const err = json as { error?: { message?: string } | string };
  const message =
    typeof err.error === "string" ? err.error : err.error?.message;
  return publicAudioError(message ?? fallback);
}

async function readJson(response: Response) {
  const raw = await response.text();
  try {
    return { raw, json: JSON.parse(raw) as unknown };
  } catch {
    return { raw, json: null };
  }
}

async function generateWithModel(model: string, prompt: string) {
  const imagesResponse = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model,
      prompt,
      provider: { allow_fallbacks: true },
    }),
  });
  const imagesBody = await readJson(imagesResponse);
  if (imagesResponse.ok && imagesBody.json) {
    const image = extractImage(imagesBody.json);
    if (image) return { image };
  }

  const chatResponse = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    },
  );
  const chatBody = await readJson(chatResponse);
  if (chatResponse.ok && chatBody.json) {
    const image = extractImage(chatBody.json);
    if (image) return { image };
  }

  const failed = !chatResponse.ok ? chatBody : imagesBody;
  return {
    error: errorFromJson(
      failed.json,
      (failed.raw || "Génération d’image impossible.").slice(0, 240),
    ),
  };
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredAdmin();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
    if (!process.env.OPENROUTER_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY manquante." },
        { status: 500 },
      );
    }

    const parsed = imageSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Prompt invalide." },
        { status: 400 },
      );
    }

    let lastError = "Génération d’image impossible.";

    for (const model of IMAGE_MODELS) {
      const result = await generateWithModel(model, parsed.data.prompt);
      if (!result.image) {
        lastError = result.error ?? lastError;
        continue;
      }

      const mimeType = result.image.mimeType.startsWith("image/")
        ? result.image.mimeType
        : "image/png";
      const ext = mimeType.includes("jpeg") ? "jpg" : "png";
      const preview = `data:${mimeType};base64,${result.image.bytes.toString("base64")}`;
      const { attachment, storedInDb } = await createAttachmentRecord({
        userId: session.user.id,
        name: `image-${Date.now()}.${ext}`,
        mimeType,
        size: result.image.bytes.length,
        bytes: result.image.bytes,
      });

      return NextResponse.json({
        id: attachment.id,
        name: attachment.name,
        mediaType: attachment.mimeType,
        preview,
        url: storedInDb ? fileUrl(attachment.id) : preview,
        size: attachment.size,
      });
    }

    console.error("[images]", lastError);
    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? publicAudioError(error.message)
            : "Génération d’image impossible.",
      },
      { status: 500 },
    );
  }
}
