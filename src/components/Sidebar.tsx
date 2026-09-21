"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/types";

type SidebarProps = {
  conversations: Conversation[];
  activeId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onSelect,
  onCreate,
  onDelete,
}: SidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Fermer le menu"
        className={`fixed inset-0 z-40 bg-black/50 md:hidden ${open ? "block" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col border-r bg-sidebar pt-[env(safe-area-inset-top)] transition-transform duration-200 md:static md:z-0 md:w-72 md:translate-x-0 md:pt-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 p-4 pb-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Maestro
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Nemesis AI</h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={onClose}
            aria-label="Fermer"
          >
            <XIcon />
          </Button>
        </div>

        <div className="px-4 pb-3">
          <Button className="w-full" onClick={onCreate}>
            <PlusIcon />
            Nouvelle conversation
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {conversations.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
              Aucune conversation pour le moment.
            </p>
          ) : (
            conversations.map((conversation) => {
              const active = conversation.id === activeId;

              return (
                <div
                  key={conversation.id}
                  className={`flex items-start gap-1 rounded-2xl border px-2 py-2 ${
                    active
                      ? "border-border bg-sidebar-accent"
                      : "border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    className="min-w-0 flex-1 px-1 py-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">
                      {conversation.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(conversation.updatedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    className="mt-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Supprimer la conversation"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
