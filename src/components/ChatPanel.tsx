"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import type { FileUIPart, UIMessage } from "ai";
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
import {
  FEATURED_MODELS,
  MEDIA_MODEL,
  collectMediaKinds,
  mediaSwitchLabel,
  modelSupportsMedia,
  type CatalogModel,
} from "@/lib/models";
import type { RouterPlugins } from "@/lib/openrouter-plugins";
import type { Conversation } from "@/lib/types";
import { readApiJson } from "@/lib/api-json";
import { getMessageText } from "@/lib/types";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Écris des paroles de chanson sur la pluie à Paris.",
  "Compose un morceau électro nostalgique, 30 secondes.",
  "Quelle est la signification de la vie ?",
];

async function uploadFiles(files: File[]) {
  const uploaded: FileUIPart[] = [];

  for (const file of files) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/files", { method: "POST", body });
    const data = (await response.json()) as {
      error?: string;
      name?: string;
      mediaType?: string;
      url?: string;
    };
    if (!response.ok || !data.url || !data.mediaType) {
      throw new Error(data.error ?? "Upload impossible");
    }
    uploaded.push({
      type: "file",
      filename: data.name ?? file.name,
      mediaType: data.mediaType,
      url: data.url,
    });
  }

  return uploaded;
}

export function ChatPanel({
  conversation,
  configured,
  onModelChange,
  onMessagesChange,
  models = FEATURED_MODELS,
  plugins,
  onPluginChange,
}: {
  conversation: Conversation;
  configured: boolean | null;
  onModelChange: (model: string) => void;
  onMessagesChange: (messages: UIMessage[]) => void;
  models?: CatalogModel[];
  plugins: RouterPlugins;
  onPluginChange: (key: keyof RouterPlugins, value: boolean) => void;
}) {
  const { messages, sendMessage, setMessages, status, stop, error } = useChat({
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

  async function submitPrompt(text: string, files: File[] = []) {
    const uploaded = files.length > 0 ? await uploadFiles(files) : [];
    const parts: UIMessage["parts"] = [];
    if (text.trim()) {
      parts.push({ type: "text", text });
    } else if (uploaded.length > 0) {
      parts.push({
        type: "text",
        text: `Fichier(s) : ${uploaded.map((file) => file.filename).join(", ")}`,
      });
    }

    parts.push(...uploaded);

    const nextMessages = [...messages, { role: "user" as const, parts }];
    const kinds = collectMediaKinds(nextMessages);
    let model = conversation.model;
    if (kinds.some((kind) => !modelSupportsMedia(model, kind, models))) {
      model = MEDIA_MODEL;
      onModelChange(model);
      toast.info(
        `Ce modèle ne lit pas ${mediaSwitchLabel(kinds)}. Passage sur Gemini 2.5 Flash.`,
      );
    }

    void sendMessage({ parts }, { body: { model, plugins } });
  }

  function attachAudio(messageId: string, file: FileUIPart) {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? { ...item, parts: [...item.parts, file] }
          : item,
      ),
    );
  }

  async function generateMusic(prompt: string) {
    const userId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        parts: [{ type: "text", text: `Crée une musique : ${prompt}` }],
      },
    ]);
    toast.info("Composition en cours…");
    try {
      const response = await fetch("/api/audio/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await readApiJson<{
        error?: string;
        url?: string;
        name?: string;
        mediaType?: string;
        title?: string;
      }>(response);
      if (!response.ok || !data.url || !data.mediaType) {
        throw new Error(data.error ?? "Musique impossible");
      }
      const audioPart: FileUIPart = {
        type: "file",
        filename: data.name ?? "musique.wav",
        mediaType: data.mediaType,
        url: data.url,
      };
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Morceau généré. Tu peux l’écouter ci-dessous.",
            },
            audioPart,
          ],
        },
      ]);
    } catch (musicError) {
      toast.error(
        musicError instanceof Error ? musicError.message : "Musique impossible",
      );
    }
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
      <MessageScrollerProvider autoScroll>
        <MessageScroller>
          {messages.length === 0 ? (
            <div className="flex h-full w-full flex-1 items-center justify-center px-4 py-6">
              <Empty className="max-w-lg border-none p-0 text-center sm:p-8">
                <EmptyHeader className="items-center text-center">
                  <EmptyTitle className="text-pretty">Votre cloud IA, en local.</EmptyTitle>
                  <EmptyDescription className="text-pretty">
                    Venice pour le texte. Écoute une réponse, ou crée une
                    musique avec l’icône note. Image / audio / PDF : Gemini.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="items-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-center whitespace-normal px-3 py-2.5 text-center text-sm font-normal text-pretty"
                      disabled={configured === false}
                      onClick={() =>
                        suggestion.startsWith("Compose")
                          ? void generateMusic(suggestion)
                          : submitPrompt(suggestion)
                      }
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
                        onAttachAudio={attachAudio}
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
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
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
          onGenerateMusic={(prompt) => void generateMusic(prompt)}
          onStop={() => stop()}
          models={models}
          plugins={plugins}
          onPluginChange={onPluginChange}
        />
      </div>
    </main>
  );
}

export function firstUserPrompt(messages: UIMessage[]) {
  const first = messages.find((message) => message.role === "user");
  return first ? getMessageText(first) : "";
}
