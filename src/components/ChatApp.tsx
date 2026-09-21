"use client";

import { Loader2Icon, MenuIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import { ChatPanel } from "@/components/ChatPanel";
import { Sidebar } from "@/components/Sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { VENICE_MODEL } from "@/lib/models";
import { useChatStore } from "@/stores/chat-store";

export function ChatApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const persistTimer = useRef<number | null>(null);
  const {
    conversations,
    activeId,
    configured,
    load,
    loadLatest,
    create,
    select,
    remove,
    setModel,
    setMessages,
    persist,
    models,
    plugins,
    setPlugin,
  } = useChatStore();

  useEffect(() => {
    void load().catch(() => {
      toast.error("Impossible de charger les conversations.");
    });
  }, [load]);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [conversations, activeId],
  );

  useEffect(() => {
    if (!active || active.loaded) return;
    void loadLatest(active.id);
  }, [active, loadLatest]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      if (!activeId) return;
      const current = useChatStore
        .getState()
        .conversations.find((item) => item.id === activeId);
      if (!current?.loaded) return;
      setMessages(activeId, messages);
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        void persist(activeId);
      }, 400);
    },
    [activeId, persist, setMessages],
  );

  const statusLabel =
    configured === false
      ? "Clé API manquante"
      : configured
        ? active?.model === VENICE_MODEL
          ? "Venice · 0 rétention"
          : "OpenRouter · ZDR"
        : "Vérification…";

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          select(id);
          setSidebarOpen(false);
        }}
        onCreate={() => {
          void create();
          setSidebarOpen(false);
        }}
        onDelete={(id) => void remove(id)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir les conversations"
          >
            <MenuIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {active?.title ?? "Nouvelle conversation"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{statusLabel}</p>
          </div>
          <Link
            href="/admin"
            aria-label="Paramètres admin"
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
          >
            <SettingsIcon />
          </Link>
        </header>

        {active ? (
          <ChatPanel
            key={active.id}
            conversation={active}
            configured={configured}
            onModelChange={(model) => void setModel(active.id, model)}
            onMessagesChange={handleMessagesChange}
            models={models}
            plugins={plugins}
            onPluginChange={setPlugin}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
            <div className="mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
              <div className="h-16 rounded-3xl border bg-card/60" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
