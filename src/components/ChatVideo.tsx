"use client";

import { Maximize2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageSkeleton } from "@/components/GeneratedImage";

export function ChatVideo({ src, label }: { src: string; label?: string }) {
  const inlineRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!open) return;
    const inline = inlineRef.current;
    const overlay = overlayRef.current;
    const time = inline?.currentTime ?? 0;
    inline?.pause();
    if (overlay) {
      overlay.currentTime = time;
      void overlay.play().catch(() => undefined);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      if (inline && overlay) {
        inline.currentTime = overlay.currentTime;
      }
    };
  }, [open]);

  return (
    <>
      <div className="relative w-full max-w-md">
        {failed ? (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
            Vidéo indisponible
          </div>
        ) : (
          <>
            {!loaded ? (
              <ImageSkeleton className="aspect-video w-full max-w-md" />
            ) : null}
            <video
              ref={inlineRef}
              src={src}
              controls
              playsInline
              preload="metadata"
              onLoadedData={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={
                loaded
                  ? "max-h-80 w-full rounded-2xl bg-black object-contain"
                  : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
              }
              aria-label={label ?? "Vidéo"}
            />
            {loaded ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Plein écran"
                className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white hover:bg-black/70"
              >
                <Maximize2Icon className="size-3.5" />
              </button>
            ) : null}
          </>
        )}
      </div>
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label={label ?? "Vidéo"}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="absolute top-4 right-4 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/40 text-white hover:bg-black/60"
              >
                <XIcon className="size-4" />
              </button>
              <video
                ref={overlayRef}
                src={src}
                controls
                autoPlay
                playsInline
                className="max-h-[90vh] max-w-[90vw] rounded-2xl bg-black object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
