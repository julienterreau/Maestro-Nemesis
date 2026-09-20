"use client";

export function AudioPlayer({
  src,
  label,
}: {
  src: string;
  label?: string;
}) {
  return (
    <div className="w-full max-w-sm space-y-1">
      {label ? (
        <p className="text-xs text-muted-foreground">{label}</p>
      ) : null}
      <audio controls src={src} className="w-full" preload="metadata" />
    </div>
  );
}
