"use client";

import { ChevronDownIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  FEATURED_MODELS,
  type CatalogModel,
  findCatalogModel,
  modelMediaLabel,
} from "@/lib/models";

export function ModelPicker({
  model,
  models,
  disabled,
  onChange,
}: {
  model: string;
  models: CatalogModel[];
  disabled?: boolean;
  onChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const catalog = models.length > 0 ? models : FEATURED_MODELS;
  const current = findCatalogModel(model, catalog) ?? {
    id: model,
    name: model,
    provider: "OpenRouter",
    image: false,
    audio: false,
    video: false,
    pdf: false,
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? catalog.filter((item) =>
          `${item.provider} ${item.name} ${item.id}`.toLowerCase().includes(needle),
        )
      : catalog;
    return list.slice(0, 80);
  }, [catalog, query]);

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
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 max-w-[46vw] min-w-0 items-center gap-1 rounded-xl px-2 text-left text-xs text-muted-foreground outline-none hover:bg-muted disabled:opacity-50 sm:max-w-56"
      >
        <span className="truncate">
          <span className="sm:hidden">{current.provider}</span>
          <span className="hidden sm:inline">
            {current.provider} · {current.name}
          </span>
        </span>
        <ChevronDownIcon className="size-3 shrink-0" />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-2 shadow-lg">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un modèle OpenRouter…"
            className="mb-2"
          />
          <p className="px-2 pb-1 text-[11px] text-muted-foreground">
            {catalog.length} modèles
          </p>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Aucun modèle trouvé.
              </p>
            ) : (
              filtered.map((item) => {
                const media = modelMediaLabel(item.id, catalog);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full flex-col items-start rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="text-sm">
                      {item.provider}
                      {media ? ` · ${media}` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
