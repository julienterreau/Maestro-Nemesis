"use client";

import { FileIcon, FileTextIcon, XIcon } from "lucide-react";

export function AttachmentCard({
  src,
  name,
  mediaType,
  onRemove,
}: {
  src: string;
  name: string;
  mediaType: string;
  onRemove?: () => void;
}) {
  const kind = mediaType.startsWith("image/")
    ? "image"
    : mediaType.startsWith("video/")
      ? "video"
      : mediaType.startsWith("audio/")
        ? "audio"
        : mediaType === "application/pdf"
          ? "pdf"
          : "file";

  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
      {kind === "image" ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : null}
      {kind === "video" ? (
        <video src={src} muted playsInline className="size-full object-cover" />
      ) : null}
      {kind === "audio" ? (
        <div className="flex size-full items-center justify-center px-1 text-muted-foreground">
          <span className="w-full truncate text-center text-[10px]">{name}</span>
        </div>
      ) : null}
      {kind === "pdf" ? (
        <div className="flex size-full flex-col items-center justify-center gap-1 px-1 text-muted-foreground">
          <FileTextIcon className="size-4" />
          <span className="w-full truncate text-center text-[10px]">{name}</span>
        </div>
      ) : null}
      {kind === "file" ? (
        <div className="flex size-full flex-col items-center justify-center gap-1 px-1 text-muted-foreground">
          <FileIcon className="size-4" />
          <span className="w-full truncate text-center text-[10px]">{name}</span>
        </div>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer ${name}`}
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

export function AttachmentCardRow({
  children,
}: {
  children: import("react").ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-start gap-2">
      {children}
    </div>
  );
}
