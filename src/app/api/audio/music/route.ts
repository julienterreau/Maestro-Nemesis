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
import {
  detectSoundscapeKind,
  isSoundscapePrompt,
  toSoundEffectPrompt,
} from "@/lib/audio-prompt";
import { synthesizeSoundscape } from "@/lib/soundscape";
import { musicSchema } from "@/lib/validations";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const parsed = musicSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Prompt invalide." },
      { status: 400 },
    );
  }

  const soundscape = !parsed.data.lyrics && isSoundscapePrompt(parsed.data.prompt);
  const kind = soundscape ? detectSoundscapeKind(parsed.data.prompt) : null;

  if (kind) {
    const bytes = synthesizeSoundscape(kind);
    const file = await saveGeneratedAudio(
      session.user.id,
      `ambiance-${kind}-${Date.now()}.wav`,
      "audio/wav",
      bytes,
    );
    return NextResponse.json({
      ...file,
      kind: "soundscape",
      title: parsed.data.prompt.slice(0, 80),
    });
  }

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY manquante." },
      { status: 500 },
    );
  }

  const prompt = parsed.data.lyrics
    ? `${parsed.data.prompt}\n\nParoles :\n${parsed.data.lyrics}`
    : soundscape
      ? toSoundEffectPrompt(parsed.data.prompt)
      : parsed.data.prompt;

  let lastError = soundscape
    ? "Génération du son impossible."
    : "Génération musicale impossible.";

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
      `${soundscape ? "ambiance" : "musique"}-${Date.now()}.${audioExtension(audio.mimeType)}`,
      audio.mimeType,
      audio.bytes,
    );
    return NextResponse.json({
      ...file,
      kind: soundscape ? "soundscape" : "music",
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
