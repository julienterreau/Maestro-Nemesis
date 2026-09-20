import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storageKey), bytes);
}

export async function readUpload(storageKey: string) {
  return readFile(path.join(UPLOAD_DIR, storageKey));
}

export function fileUrl(id: string) {
  return `/api/files/${id}`;
}
