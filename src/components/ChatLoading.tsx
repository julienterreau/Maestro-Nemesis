"use client";

import { Loader2Icon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatLoading() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-72 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-start justify-between gap-3 p-4 pb-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Maestro
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Nemesis AI</h1>
          </div>
        </div>
        <div className="px-4 pb-3">
          <Button className="w-full" disabled>
            Nouvelle conversation
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Nouvelle conversation</p>
            <p className="truncate text-xs text-muted-foreground">Chargement…</p>
          </div>
          <Button variant="outline" size="icon-sm" disabled aria-label="Paramètres admin">
            <SettingsIcon />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>

        <div className="mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
          <div className="h-16 rounded-3xl border bg-card/60" />
        </div>
      </div>
    </div>
  );
}
