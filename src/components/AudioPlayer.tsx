"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  label,
  loop = false,
}: {
  src: string;
  label?: string;
  loop?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const player = audioRef.current;
    if (!player) return;

    const onTime = () => setCurrent(player.currentTime);
    const onMeta = () => setDuration(player.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };

    player.addEventListener("timeupdate", onTime);
    player.addEventListener("loadedmetadata", onMeta);
    player.addEventListener("ended", onEnd);
    return () => {
      player.removeEventListener("timeupdate", onTime);
      player.removeEventListener("loadedmetadata", onMeta);
      player.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-muted/60 px-3 py-2">
      <audio ref={audioRef} src={src} preload="metadata" loop={loop} />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Lecture"}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        {playing ? (
          <PauseIcon className="size-3.5 fill-current" />
        ) : (
          <PlayIcon className="size-3.5 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        {label ? (
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        ) : null}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={current}
          aria-label="Progression"
          className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          onChange={(event) => {
            const next = Number(event.target.value);
            const audio = audioRef.current;
            if (audio) audio.currentTime = next;
            setCurrent(next);
          }}
        />
        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
          {formatTime(current)} / {formatTime(duration)}
        </p>
      </div>
    </div>
  );
}
