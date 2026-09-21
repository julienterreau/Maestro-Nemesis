"use client";

import { CheckIcon, ChevronDownIcon, Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  PINNED_MODELS,
  type CatalogModel,
  type MediaKind,
  findCatalogModel,
  isFreeModel,
  modelMediaLabel,
} from "@/lib/models";
import { useChatStore } from "@/stores/chat-store";

type CatalogFilter = "all" | "free" | MediaKind;

const FILTERS: { id: CatalogFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "free", label: "Gratuit" },
  { id: "image", label: "Images" },
  { id: "audio", label: "Audio" },
  { id: "video", label: "Vidéo" },
];

export function ModelPicker({
  model,
  models,
  disabled,
  onChange,
  preferMedia,
}: {
  model: string;
  models: CatalogModel[];
  disabled?: boolean;
  onChange: (model: string) => void;
  preferMedia?: MediaKind | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("all");
  const ensureCatalog = useChatStore((state) => state.ensureCatalog);
  const catalogLoading = useChatStore((state) => state.catalogLoading);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const needle = query.trim();
  const searching = needle.length > 0;
  const catalog = models.length > 0 ? models : PINNED_MODELS;
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
    const source = !needle
      ? PINNED_MODELS.map(
          (pinned) => catalog.find((item) => item.id === pinned.id) ?? pinned,
        )
      : catalog;
    let list = source.filter((item) => {
      if (filter === "free" && !isFreeModel(item.id)) return false;
      if (filter === "image" && !item.image) return false;
      if (filter === "audio" && !item.audio) return false;
      if (filter === "video" && !item.video) return false;
      if (filter === "pdf" && !item.pdf) return false;
      if (!needle) return true;
      return `${item.provider} ${item.name} ${item.id}`
        .toLowerCase()
        .includes(needle);
    });
    if (current.id && !list.some((item) => item.id === current.id)) {
      list = [current, ...list];
    }
    return list;
  }, [catalog, query, current, filter]);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (preferMedia) setFilter(preferMedia);
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, model, preferMedia]);

  useEffect(() => {
    if (!open || !searching) return;
    void ensureCatalog();
  }, [open, searching, ensureCatalog]);

  const countLabel = searching
    ? catalogLoading
      ? "Recherche dans OpenRouter…"
      : `${filtered.length} modèles`
    : filter === "free"
      ? `${filtered.length} modèles gratuits · tape pour chercher`
      : `${filtered.length} modèles · tape pour chercher`;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 max-w-[46vw] min-w-0 cursor-pointer items-center gap-1 rounded-xl px-2 text-left text-xs text-foreground outline-none hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-56"
      >
        <span className="truncate">
          <span className="sm:hidden">{current.name}</span>
          <span className="hidden sm:inline">
            {current.provider} · {current.name}
          </span>
        </span>
        <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-2 shadow-lg">
          <div className="relative mb-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                const next = event.target.value;
                setQuery(next);
                if (next.trim()) void ensureCatalog();
              }}
              placeholder={
                filter === "image"
                  ? "Chercher un modèle image…"
                  : filter === "audio"
                    ? "Chercher un modèle audio…"
                    : filter === "video"
                      ? "Chercher un modèle vidéo…"
                      : "Tape pour chercher dans tout OpenRouter…"
              }
              className="pr-9"
            />
            {searching && catalogLoading ? (
              <Loader2Icon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-1 px-1">
            {FILTERS.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`cursor-pointer rounded-full px-2 py-0.5 text-[11px] ${
                    active
                      ? "bg-muted text-foreground ring-1 ring-border"
                      : "text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="px-2 pb-1 text-[11px] text-muted-foreground">
            {countLabel}
          </p>
          <div className="max-h-72 overflow-y-auto">
            {searching && catalogLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Chargement des modèles…
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Aucun modèle trouvé.
              </p>
            ) : (
              filtered.map((item) => {
                const media = modelMediaLabel(item.id, catalog);
                const active = item.id === model;
                const free = isFreeModel(item.id);
                return (
                  <button
                    key={item.id}
                    ref={active ? activeRef : undefined}
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left ${
                      active
                        ? "bg-muted ring-1 ring-border"
                        : "hover:bg-muted/70"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="truncate">
                          {item.provider}
                          {media ? ` · ${media}` : ""}
                        </span>
                        {free ? (
                          <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-px text-[10px] text-primary">
                            Gratuit
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.name}
                      </span>
                    </span>
                    {active ? (
                      <CheckIcon className="size-4 shrink-0 text-primary" />
                    ) : null}
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
