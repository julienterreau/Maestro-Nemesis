"use client";

import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ImageSkeleton({
  className = "h-72 w-72 sm:h-80 sm:w-80",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-muted ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 animate-pulse bg-muted" />
      <div className="image-shimmer absolute inset-0" />
    </div>
  );
}

export function GeneratedImage({ src, alt }: { src: string; alt: string }) {
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
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (loaded) setOpen(true);
        }}
        className="relative block max-w-full cursor-zoom-in rounded-2xl text-left"
        aria-label={loaded ? `Agrandir ${alt}` : `Chargement de ${alt}`}
      >
        {failed ? (
          <div className="flex h-72 w-72 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground sm:h-80 sm:w-80">
            Image indisponible
          </div>
        ) : (
          <>
            {!loaded ? <ImageSkeleton /> : null}
            <img
              src={src}
              alt={alt}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={
                loaded
                  ? "max-h-80 max-w-full rounded-2xl object-contain"
                  : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
              }
            />
          </>
        )}
      </button>
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
              onClick={() => setOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label={alt}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/40 text-white hover:bg-black/60"
              >
                <XIcon className="size-4" />
              </button>
              <img
                src={src}
                alt={alt}
                className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
