import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import {
  TTS_MODELS,
  audioExtension,
  looksLikeAudio,
  openRouterHeaders,
  publicAudioError,
  saveGeneratedAudio,
} from "@/lib/audio";
import { speechSchema } from "@/lib/validations";

export const maxDuration = 60;

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

    const parsed = speechSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Texte invalide." },
        { status: 400 },
      );
    }

    let lastError = "Synthèse vocale impossible.";

    for (const candidate of TTS_MODELS) {
      const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: openRouterHeaders(),
        body: JSON.stringify({
          model: candidate.model,
          input: parsed.data.text,
          voice: candidate.voice,
          response_format: "mp3",
          provider: { allow_fallbacks: true, data_collection: "allow" },
        }),
      });

      const mimeType = response.headers.get("content-type") || "";
      const bytes = Buffer.from(await response.arrayBuffer());

      if (!response.ok) {
        lastError = publicAudioError(
          bytes.length
            ? bytes.toString("utf8").slice(0, 240)
            : `HTTP ${response.status}`,
        );
        if (bytes.length) {
          try {
            const json = JSON.parse(bytes.toString("utf8")) as {
              error?: { message?: string } | string;
            };
            const message =
              typeof json.error === "string" ? json.error : json.error?.message;
            if (message) lastError = publicAudioError(message);
          } catch {
            // keep lastError
          }
        }
        continue;
      }

      if (!looksLikeAudio(bytes, mimeType)) {
        lastError = publicAudioError(
          bytes.toString("utf8").slice(0, 240) || "Réponse TTS inattendue.",
        );
        continue;
      }

      const mediaType = mimeType.startsWith("audio/") ? mimeType : "audio/mpeg";
      const file = await saveGeneratedAudio(
        session.user.id,
        `voix-${Date.now()}.${audioExtension(mediaType)}`,
        mediaType,
        bytes,
      );
      return NextResponse.json(file);
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? publicAudioError(error.message)
            : "Synthèse vocale impossible.",
      },
      { status: 500 },
    );
  }
}
