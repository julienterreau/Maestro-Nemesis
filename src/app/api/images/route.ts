import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { openRouterHeaders, publicAudioError } from "@/lib/audio";
import { createAttachmentRecord, fileUrl } from "@/lib/files";
import { IMAGE_GEN_MODEL } from "@/lib/models";
import { imageSchema } from "@/lib/validations";

export const maxDuration = 60;

const IMAGE_MODELS = [IMAGE_GEN_MODEL, "google/gemini-2.5-flash-image-preview"] as const;

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
      const match = url.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/i);
      if (match) {
        return { bytes: Buffer.from(match[2], "base64"), mimeType: match[1] };
      }
    }
  }
  return null;
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
      const response = await fetch("https://openrouter.ai/api/v1/images", {
        method: "POST",
        headers: openRouterHeaders(),
        body: JSON.stringify({
          model,
          prompt: parsed.data.prompt,
          n: 1,
          provider: { allow_fallbacks: true, data_collection: "allow" },
        }),
      });

      const raw = await response.text();
      let json: unknown = null;
      try {
        json = JSON.parse(raw);
      } catch {
        lastError = publicAudioError(raw.slice(0, 240) || lastError);
        continue;
      }

      if (!response.ok) {
        const err = json as { error?: { message?: string } | string };
        const message =
          typeof err.error === "string" ? err.error : err.error?.message;
        lastError = publicAudioError(message ?? raw.slice(0, 240));
        continue;
      }

      const image = extractImage(json);
      if (!image) {
        lastError = "Aucune image n’a été renvoyée par le modèle.";
        continue;
      }

      const mimeType = image.mimeType.startsWith("image/")
        ? image.mimeType
        : "image/png";
      const ext = mimeType.includes("jpeg") ? "jpg" : "png";
      const { attachment, storedInDb } = await createAttachmentRecord({
        userId: session.user.id,
        name: `image-${Date.now()}.${ext}`,
        mimeType,
        size: image.bytes.length,
        bytes: image.bytes,
      });

      return NextResponse.json({
        id: attachment.id,
        name: attachment.name,
        mediaType: attachment.mimeType,
        url: storedInDb
          ? fileUrl(attachment.id)
          : `data:${mimeType};base64,${image.bytes.toString("base64")}`,
        size: attachment.size,
      });
    }

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
