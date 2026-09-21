import { createAttachmentRecord, fileUrl } from "@/lib/files";

export const TTS_MODELS = [
  { model: "openai/gpt-4o-mini-tts-2025-12-15", voice: "alloy" },
  { model: "mistralai/voxtral-mini-tts-2603", voice: "en_paul_neutral" },
  { model: "x-ai/grok-voice-tts-1.0", voice: "eve" },
] as const;

export const MUSIC_MODELS = [
  "google/lyria-3-clip-preview",
  "google/lyria-3-pro-preview",
] as const;

export function publicAudioError(message: string) {
  if (/insufficient credits|never purchased credits|payment required|402/i.test(message)) {
    return "Pas de crédits OpenRouter. Recharge sur openrouter.ai/settings/credits — Gemini, images et vidéos sont payants.";
  }
  if (/no endpoints found/i.test(message)) {
    return "Aucun endpoint image n’est dispo pour ce modèle (retiré, ou bloqué par Privacy OpenRouter). Réessaie, on bascule sur un autre modèle.";
  }
  if (/user not found/i.test(message)) {
    return "Clé OpenRouter invalide (souvent une management key). Crée une clé API modèles sur openrouter.ai/settings/keys, mets-la dans .env.local, puis relance le serveur.";
  }
  if (/zero data retention|zdr|data policy/i.test(message)) {
    return "Les modèles voix et musique n’offrent pas le zéro rétention. Autorise la collecte sur openrouter.ai/settings/privacy, uniquement pour l’audio.";
  }
  if (/stream\s*:\strue/i.test(message)) {
    return "Le modèle audio exige un flux. Réessaie, c’est maintenant activé côté serveur.";
  }
  return message || "Audio OpenRouter indisponible.";
}

export async function audioErrorMessage(response: Response) {
  const raw = await response.text();
  try {
    const json = JSON.parse(raw) as { error?: { message?: string } | string };
    const message =
      typeof json.error === "string" ? json.error : json.error?.message;
    return publicAudioError(message ?? raw.slice(0, 240));
  } catch {
    return publicAudioError(raw.slice(0, 240));
  }
}

export function openRouterHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY?.trim() ?? ""}`,
    "Content-Type": "application/json",
    "HTTP-Referer":
      process.env.OPENROUTER_SITE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_SITE_NAME ?? "AI Cloud Local",
  };
}

export async function saveGeneratedAudio(
  userId: string,
  name: string,
  mimeType: string,
  bytes: Buffer,
) {
  const { attachment, storedInDb } = await createAttachmentRecord({
    userId,
    name,
    mimeType,
    size: bytes.length,
    bytes,
  });
  return {
    id: attachment.id,
    name: attachment.name,
    mediaType: attachment.mimeType,
    url: storedInDb
      ? fileUrl(attachment.id)
      : `data:${mimeType};base64,${bytes.toString("base64")}`,
    size: attachment.size,
  };
}

export function extractAudioFromCompletion(json: unknown): {
  bytes: Buffer;
  mimeType: string;
} | null {
  const data = json as {
    choices?: Array<{
      message?: {
        audio?: { data?: string; url?: string };
        content?: unknown;
      };
    }>;
  };
  const message = data.choices?.[0]?.message;
  if (typeof message?.audio?.data === "string") {
    return {
      bytes: Buffer.from(message.audio.data, "base64"),
      mimeType: "audio/wav",
    };
  }
  if (typeof message?.audio?.url === "string") {
    const fromUrl = parseDataAudioUrl(message.audio.url);
    if (fromUrl) return fromUrl;
  }

  const content = message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const item = part as {
        type?: string;
        media_type?: string;
        data?: string;
        url?: string;
        audio?: { data?: string; url?: string };
        input_audio?: { data?: string };
      };
      const b64 =
        item.audio?.data ?? item.input_audio?.data ?? item.data ?? undefined;
      if (typeof b64 === "string" && b64.length > 80) {
        return {
          bytes: Buffer.from(b64, "base64"),
          mimeType: item.media_type ?? "audio/wav",
        };
      }
      const url = item.audio?.url ?? item.url;
      if (typeof url === "string") {
        const fromUrl = parseDataAudioUrl(url);
        if (fromUrl) return fromUrl;
      }
    }
  }

  if (typeof content === "string") {
    return parseDataAudioUrl(content);
  }

  return null;
}

export async function extractAudioFromStream(response: Response) {
  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      return extractAudioFromCompletion(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  const chunks: Buffer[] = [];
  for (const line of text.split(/\r?\n/)) {
    const data = line.startsWith("data:") ? line.slice(5).trim() : "";
    if (!data || data === "[DONE]") continue;
    try {
      const json = JSON.parse(data) as {
        error?: { message?: string };
        choices?: Array<{
          delta?: { audio?: { data?: string; url?: string } };
          message?: { audio?: { data?: string; url?: string } };
        }>;
      };
      if (json.error?.message) {
        throw new Error(json.error.message);
      }
      const audio =
        json.choices?.[0]?.delta?.audio ?? json.choices?.[0]?.message?.audio;
      if (typeof audio?.data === "string" && audio.data.length > 0) {
        chunks.push(Buffer.from(audio.data, "base64"));
      }
      if (typeof audio?.url === "string") {
        const fromUrl = parseDataAudioUrl(audio.url);
        if (fromUrl) chunks.push(fromUrl.bytes);
      }
    } catch (error) {
      if (error instanceof Error && !error.message.startsWith("Unexpected")) {
        throw error;
      }
    }
  }

  if (chunks.length === 0) return null;
  return { bytes: Buffer.concat(chunks), mimeType: "audio/wav" };
}

function parseDataAudioUrl(value: string) {
  const match = value.match(
    /data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/i,
  );
  if (!match) return null;
  return {
    bytes: Buffer.from(match[2], "base64"),
    mimeType: match[1],
  };
}

export function looksLikeAudio(bytes: Buffer, mimeType: string) {
  if (mimeType.startsWith("audio/")) return true;
  if (bytes.length < 16) return false;
  const head = bytes.subarray(0, 4).toString("latin1");
  if (head.startsWith("ID3") || head === "RIFF" || head === "OggS" || head === "fLaC") {
    return true;
  }
  return mimeType.includes("octet-stream") && bytes[0] === 0xff;
}

export function audioExtension(mimeType: string) {
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  return "mp3";
}
