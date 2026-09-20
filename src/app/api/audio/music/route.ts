import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import {
  MUSIC_MODELS,
  audioExtension,
  extractAudioFromStream,
  openRouterHeaders,
  publicAudioError,
  saveGeneratedAudio,
} from "@/lib/audio";
import { musicSchema } from "@/lib/validations";

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

  const parsed = musicSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Prompt invalide." },
      { status: 400 },
    );
  }

  const prompt = parsed.data.lyrics
    ? `${parsed.data.prompt}\n\nParoles :\n${parsed.data.lyrics}`
    : parsed.data.prompt;

  let lastError = "Génération musicale impossible.";

  for (const model of MUSIC_MODELS) {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: openRouterHeaders(),
        body: JSON.stringify({
          model,
          stream: true,
          modalities: ["text", "audio"],
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          provider: { allow_fallbacks: true, data_collection: "allow" },
        }),
      },
    );

    if (!response.ok) {
      lastError = publicAudioError(await response.text());
      continue;
    }

    let audio: { bytes: Buffer; mimeType: string } | null = null;
    try {
      audio = await extractAudioFromStream(response);
    } catch (error) {
      lastError = publicAudioError(
        error instanceof Error ? error.message : lastError,
      );
      continue;
    }
    if (!audio) {
      lastError = "Aucun audio n’a été renvoyé par le modèle musical.";
      continue;
    }

    const file = await saveGeneratedAudio(
      session.user.id,
      `musique-${Date.now()}.${audioExtension(audio.mimeType)}`,
      audio.mimeType,
      audio.bytes,
    );
    return NextResponse.json({
      ...file,
      title: parsed.data.prompt.slice(0, 80),
    });
  }

  return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? publicAudioError(error.message)
            : "Génération musicale impossible.",
      },
      { status: 500 },
    );
  }
}
