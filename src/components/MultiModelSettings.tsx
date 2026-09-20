"use client";

import { LayersIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RouterPlugins } from "@/lib/openrouter-plugins";

const OPTIONS: Array<{
  key: keyof RouterPlugins;
  title: string;
  description: string;
  id: string;
}> = [
  {
    key: "advisor",
    title: "Advisor",
    description:
      "Le modèle consulte un conseiller plus fort en cours de génération, avec l’historique.",
    id: "openrouter:advisor",
  },
  {
    key: "subagent",
    title: "Subagent",
    description:
      "Délègue des sous-tâches à un modèle plus petit et plus rapide.",
    id: "openrouter:subagent",
  },
  {
    key: "fusion",
    title: "Fusion",
    description:
      "Envoie le prompt à un panel de modèles, puis un analyste compare les réponses.",
    id: "openrouter:fusion",
  },
];

export function MultiModelSettings({
  plugins,
  disabled,
  onChange,
}: {
  plugins: RouterPlugins;
  disabled?: boolean;
  onChange: (key: keyof RouterPlugins, value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeCount = Number(plugins.advisor) + Number(plugins.subagent) + Number(plugins.fusion);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs text-muted-foreground outline-none hover:bg-muted disabled:opacity-50"
        aria-expanded={open}
        aria-label="Options multi-modèles"
      >
        <LayersIcon className="size-3.5" />
        <span className="hidden sm:inline">Multi</span>
        {activeCount > 0 ? (
          <span className="rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-3 shadow-lg">
          <p className="mb-3 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Multi-model
          </p>
          <div className="space-y-3">
            {OPTIONS.map((option) => (
              <label
                key={option.key}
                className="flex items-start justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground/80">
                    {option.id}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={plugins[option.key]}
                  disabled={disabled}
                  onClick={() => onChange(option.key, !plugins[option.key])}
                  className={`mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${
                    plugins[option.key] ? "bg-lime-400" : "bg-muted"
                  }`}
                >
                  <span
                    className={`block size-5 rounded-full bg-white shadow transition-transform ${
                      plugins[option.key] ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
