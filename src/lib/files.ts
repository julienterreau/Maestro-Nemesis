import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  webm: "video/webm",
  mp4: "video/mp4",
  mov: "video/quicktime",
  pdf: "application/pdf",
};

export function inferMimeType(name: string, mimeType: string) {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  const ext = name.split(".").pop()?.toLowerCase();
  return (ext && EXT_MIME[ext]) || mimeType || "application/octet-stream";
}

const ALLOWED_PREFIXES = ["image/", "audio/", "video/", "text/"];
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/json",
  "application/zip",
]);

export function isAllowedFile(mimeType: string) {
  return (
    ALLOWED_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) ||
    ALLOWED_TYPES.has(mimeType)
  );
}

export async function saveUpload(storageKey: string, bytes: Buffer) {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, storageKey), bytes);
  } catch {
    // Vercel serverless has no durable local disk.
  }
}

export async function readUpload(storageKey: string) {
  return readFile(path.join(UPLOAD_DIR, storageKey));
}

export function loadAttachmentBytes(attachment: {
  storageKey: string;
  bytes?: Uint8Array | null;
}) {
  if (attachment.bytes && attachment.bytes.length > 0) {
    return Promise.resolve(Buffer.from(attachment.bytes));
  }
  return readUpload(attachment.storageKey);
}

function isMissingBytesField(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (/unknown argument [`']bytes[`']/i.test(error.message)) return true;
  if (/bytes of relation attachment/i.test(error.message)) return true;
  if (/column .*bytes/i.test(error.message)) return true;
  return (error as { code?: string }).code === "P2022";
}

let bytesColumnReady = false;

async function ensureAttachmentBytesColumn() {
  if (bytesColumnReady) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "attachment" ADD COLUMN IF NOT EXISTS "bytes" BYTEA`,
  );
  bytesColumnReady = true;
}

export async function createAttachmentRecord(input: {
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  bytes: Buffer;
}) {
  const storageKey = crypto.randomUUID();
  const base = {
    userId: input.userId,
    name: input.name,
    mimeType: input.mimeType,
    size: input.size,
    storageKey,
  };

  const createWithBytes = () =>
    prisma.attachment.create({
      data: { ...base, bytes: new Uint8Array(input.bytes) },
    });

  try {
    const attachment = await createWithBytes();
    await saveUpload(storageKey, input.bytes);
    return { attachment, storedInDb: true };
  } catch (error) {
    if (!isMissingBytesField(error)) throw error;
    try {
      await ensureAttachmentBytesColumn();
      const attachment = await createWithBytes();
      await saveUpload(storageKey, input.bytes);
      return { attachment, storedInDb: true };
    } catch {
      try {
        const attachment = await prisma.attachment.create({ data: base });
        await saveUpload(storageKey, input.bytes);
        return { attachment, storedInDb: false };
      } catch {
        await saveUpload(storageKey, input.bytes);
        return {
          attachment: {
            ...base,
            id: storageKey,
            messageId: null,
            createdAt: new Date(),
            bytes: null,
          },
          storedInDb: false,
        };
      }
    }
  }
}

export function fileUrl(id: string) {
  return `/api/files/${id}`;
}

export function attachmentIdFromUrl(url: string) {
  try {
    const pathname = url.includes("://") ? new URL(url).pathname : url.split("?")[0];
    const match = /^\/api\/files\/([^/]+)$/.exec(pathname);
    return match?.[1];
  } catch {
    return;
  }
}
