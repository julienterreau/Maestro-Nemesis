"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { ChatMessage } from "@/components/ChatMessage";
import { PromptForm } from "@/components/PromptForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { VENICE_MODEL } from "@/lib/models";
import type { Conversation } from "@/lib/types";
import { getMessageText } from "@/lib/types";

const SUGGESTIONS = [
  "Explique-moi un concept comme si j’avais 12 ans.",
  "Aide-moi à structurer un projet Next.js.",
  "Quelle est la signification de la vie ?",
];

export function ChatPanel({
  conversation,
  configured,
  onMenu,
  onModelChange,
  onMessagesChange,
}: {
  conversation: Conversation;
  configured: boolean | null;
  onMenu: () => void;
  onModelChange: (model: string) => void;
  onMessagesChange: (messages: UIMessage[]) => void;
}) {
  const { messages, sendMessage, status, stop, error } = useChat({
    id: conversation.id,
    messages: conversation.messages,
  });
  const synced = useRef("");
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const next = JSON.stringify(messages);
    if (next === synced.current) return;
    synced.current = next;
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  function submitPrompt(text: string) {
    void sendMessage({ text }, { body: { model: conversation.model } });
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <Button variant="outline" className="md:hidden" onClick={onMenu}>
          Menu
        </Button>
        <p className="hidden text-sm text-muted-foreground sm:block">
          {configured === false
            ? "Clé API manquante"
            : configured
              ? conversation.model === VENICE_MODEL
                ? "Venice · 0 rétention"
                : "OpenRouter · ZDR"
              : "Vérification…"}
        </p>
      </header>

      <MessageScrollerProvider autoScroll>
        <MessageScroller>
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-4">
              <Empty className="border-none">
                <EmptyHeader>
                  <EmptyTitle>Votre cloud IA, en local.</EmptyTitle>
                  <EmptyDescription>
                    Venice Uncensored par défaut, avec Zero Data Retention.
                    Les autres modèles restent filtrés sur des endpoints ZDR.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left"
                      disabled={configured === false}
                      onClick={() => submitPrompt(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </EmptyContent>
              </Empty>
            </div>
          ) : (
            <>
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl px-4 py-6">
                  {messages.map((message, index) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={message.role === "user"}
                    >
                      <ChatMessage
                        message={message}
                        isStreaming={
                          isBusy &&
                          message.role === "assistant" &&
                          index === messages.length - 1
                        }
                      />
                    </MessageScrollerItem>
                  ))}
                  {status === "submitted" ? (
                    <MessageScrollerItem messageId="thinking">
                      <p className="text-sm text-muted-foreground">Réflexion…</p>
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton>Derniers messages</MessageScrollerButton>
            </>
          )}
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pb-5">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Échec de la requête</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <PromptForm
          model={conversation.model}
          onModelChange={onModelChange}
          isBusy={isBusy}
          disabled={configured === false}
          onSubmit={submitPrompt}
          onStop={() => stop()}
        />
      </div>
    </main>
  );
}

export function firstUserPrompt(messages: UIMessage[]) {
  const first = messages.find((message) => message.role === "user");
  return first ? getMessageText(first) : "";
}
