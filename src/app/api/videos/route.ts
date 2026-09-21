import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { openRouterHeaders, publicAudioError } from "@/lib/audio";
import { createAttachmentRecord, fileUrl } from "@/lib/files";
import { VIDEO_GEN_MODEL } from "@/lib/models";
import { videoSchema } from "@/lib/validations";

export const maxDuration = 300;

const VIDEO_MODELS = [
  VIDEO_GEN_MODEL,
  "bytedance/seedance-2.0-fast",
  "google/veo-3.1-lite",
] as const;

const TERMINAL_ERROR = new Set(["failed", "cancelled", "expired"]);

type VideoJob = {
  id?: string;
  polling_url?: string;
  status?: string;
  error?: string | { message?: string };
  unsigned_urls?: string[];
};

function jobError(job: VideoJob) {
  if (typeof job.error === "string") return job.error;
  return job.error?.message;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pollingUrl(job: VideoJob) {
  const raw = job.polling_url;
  if (raw) return new URL(raw, "https://openrouter.ai").toString();
  if (job.id) return `https://openrouter.ai/api/v1/videos/${job.id}`;
  return null;
}

function downloadUrl(job: VideoJob) {
  return (
    job.unsigned_urls?.[0] ??
    (job.id
      ? `https://openrouter.ai/api/v1/videos/${job.id}/content?index=0`
      : null)
  );
}

async function pollJob(initial: VideoJob) {
  let job = initial;
  const deadline = Date.now() + 240_000;
  const url = pollingUrl(job);
  if (!url) throw new Error("Job vidéo incomplet.");

  while (true) {
    if (job.status === "completed") return job;
    if (job.status && TERMINAL_ERROR.has(job.status)) {
      throw new Error(jobError(job) ?? `Génération ${job.status}.`);
    }
    if (Date.now() >= deadline) {
      throw new Error("La vidéo a mis trop longtemps. Réessaie.");
    }
    await sleep(5000);
    const response = await fetch(url, { headers: openRouterHeaders() });
    const raw = await response.text();
    let next: VideoJob = {};
    try {
      next = JSON.parse(raw) as VideoJob;
    } catch {
      throw new Error(publicAudioError(raw.slice(0, 240)));
    }
    if (!response.ok) {
      throw new Error(
        publicAudioError(jobError(next) ?? raw.slice(0, 240)),
      );
    }
    job = next;
  }
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

    const parsed = videoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Prompt invalide." },
        { status: 400 },
      );
    }

    let lastError = "Génération de vidéo impossible.";

    for (const model of VIDEO_MODELS) {
      const response = await fetch("https://openrouter.ai/api/v1/videos", {
        method: "POST",
        headers: openRouterHeaders(),
        body: JSON.stringify({
          model,
          prompt: parsed.data.prompt,
          duration: 4,
          resolution: "720p",
          aspect_ratio: "16:9",
          generate_audio: false,
          provider: { allow_fallbacks: true, data_collection: "allow" },
        }),
      });

      const raw = await response.text();
      let json: VideoJob = {};
      try {
        json = JSON.parse(raw) as VideoJob;
      } catch {
        lastError = publicAudioError(raw.slice(0, 240) || lastError);
        continue;
      }

      if (!response.ok && response.status !== 202) {
        lastError = publicAudioError(jobError(json) ?? raw.slice(0, 240));
        continue;
      }

      try {
        const job = await pollJob(json);
        const url = downloadUrl(job);
        if (!url) {
          lastError = "Aucune vidéo n’a été renvoyée.";
          continue;
        }

        const download = await fetch(url, { headers: openRouterHeaders() });
        if (!download.ok) {
          lastError = publicAudioError(
            (await download.text()).slice(0, 240),
          );
          continue;
        }

        const bytes = Buffer.from(await download.arrayBuffer());
        if (bytes.length < 1000) {
          lastError = "La vidéo renvoyée est vide.";
          continue;
        }

        const mimeType =
          download.headers.get("content-type")?.split(";")[0] || "video/mp4";
        const { attachment, storedInDb } = await createAttachmentRecord({
          userId: session.user.id,
          name: `video-${Date.now()}.mp4`,
          mimeType: mimeType.startsWith("video/") ? mimeType : "video/mp4",
          size: bytes.length,
          bytes,
        });

        return NextResponse.json({
          id: attachment.id,
          name: attachment.name,
          mediaType: attachment.mimeType,
          url: storedInDb
            ? fileUrl(attachment.id)
            : `data:${attachment.mimeType};base64,${bytes.toString("base64")}`,
          size: attachment.size,
        });
      } catch (error) {
        lastError =
          error instanceof Error
            ? publicAudioError(error.message)
            : lastError;
      }
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? publicAudioError(error.message)
            : "Génération de vidéo impossible.",
      },
      { status: 500 },
    );
  }
}
