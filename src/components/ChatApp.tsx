"use client";

import { MenuIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { toast } from "sonner";
import { ChatLoading } from "@/components/ChatLoading";
import { ChatPanel } from "@/components/ChatPanel";
import { Sidebar } from "@/components/Sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { VENICE_MODEL } from "@/lib/models";
import { useChatStore } from "@/stores/chat-store";

export function ChatApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ChatLoading />;
  }

  return <ChatAppReady />;
}

function ChatAppReady() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const persistTimer = useRef<number | null>(null);
  const {
    conversations,
    activeId,
    loading,
    configured,
    load,
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

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [conversations, activeId],
  );

  const handleMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      if (!activeId) return;
      setMessages(activeId, messages);
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        void persist(activeId);
      }, 400);
    },
    [activeId, persist, setMessages],
  );

  if (loading) {
    return <ChatLoading />;
  }

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

      <div className="flex min-w-0 flex-1 flex-col">
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
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Ouvrez le menu pour créer une conversation.
          </div>
        )}
      </div>
    </div>
  );
}
