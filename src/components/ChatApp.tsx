"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import { ChatPanel, firstUserPrompt } from "@/components/ChatPanel";
import { Sidebar } from "@/components/Sidebar";
import { DEFAULT_MODEL } from "@/lib/models";
import {
  createConversation,
  loadConversations,
  saveConversations,
  titleFromPrompt,
} from "@/lib/storage";
import type { Conversation } from "@/lib/types";

const DRAFT_CONVERSATION: Conversation = {
  id: "local-draft",
  title: "Nouvelle conversation",
  model: DEFAULT_MODEL,
  messages: [],
  updatedAt: 0,
};

export function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([
    DRAFT_CONVERSATION,
  ]);
  const [activeId, setActiveId] = useState(DRAFT_CONVERSATION.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadConversations();
    const initial = stored.length > 0 ? stored : [createConversation()];
    setConversations(initial);
    setActiveId(initial[0].id);
    setHydrated(true);

    fetch("/api/chat")
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => {
        setConfigured(Boolean(data.configured));
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveConversations(conversations);
  }, [conversations, hydrated]);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [conversations, activeId],
  );

  function updateConversation(
    id: string,
    updater: (conversation: Conversation) => Conversation,
  ) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? updater(conversation) : conversation,
      ),
    );
  }

  const handleMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      updateConversation(activeId, (conversation) => {
        const prompt = firstUserPrompt(messages);
        return {
          ...conversation,
          title:
            conversation.title === "Nouvelle conversation" && prompt
              ? titleFromPrompt(prompt)
              : conversation.title,
          messages,
          updatedAt: Date.now(),
        };
      });
    },
    [activeId],
  );

  function handleCreate() {
    const next = createConversation(active?.model ?? DEFAULT_MODEL);
    setConversations((current) => [next, ...current]);
    setActiveId(next.id);
    setSidebarOpen(false);
  }

  function handleDelete(id: string) {
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== id);
      const next = remaining.length > 0 ? remaining : [createConversation()];
      setActiveId((currentId) => (currentId === id ? next[0].id : currentId));
      return next;
    });
  }

  return (
    <div className="flex h-svh bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />

      {active ? (
        <ChatPanel
          key={active.id}
          conversation={active}
          configured={configured}
          onMenu={() => setSidebarOpen(true)}
          onModelChange={(model) =>
            updateConversation(active.id, (conversation) => ({
              ...conversation,
              model,
            }))
          }
          onMessagesChange={handleMessagesChange}
        />
      ) : null}
    </div>
  );
}
