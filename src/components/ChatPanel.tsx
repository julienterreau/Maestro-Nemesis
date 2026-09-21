"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatScroller } from "@/components/ChatScroller";
import { ImageSkeleton } from "@/components/GeneratedImage";
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
  FEATURED_MODELS,
  capabilityHint,
  collectMediaKinds,
  modelSupportsMedia,
  type CatalogModel,
  type MediaKind,
} from "@/lib/models";
import { isAudioGenerationPrompt } from "@/lib/audio-prompt";
import {
  isImageGenerationPrompt,
  isVideoGenerationPrompt,
} from "@/lib/prompt-intent";
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
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { model: conversation.model, plugins },
    }),
  });
  const synced = useRef("");
  const [mediaBusy, setMediaBusy] = useState<null | "son" | "image" | "video">(
    null,
  );
  const isBusy = status === "submitted" || status === "streaming" || Boolean(mediaBusy);

  useEffect(() => {
    const next = JSON.stringify(messages);
    if (next === synced.current) return;
    synced.current = next;
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  function suggestMedia(kind: MediaKind, prompt: string) {
    const hint = capabilityHint(kind, models);
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text", text: hint.text }],
      },
    ]);
  }

  async function submitPrompt(text: string, files: File[] = []) {
    if (files.length === 0 && isAudioGenerationPrompt(text)) {
      if (!modelSupportsMedia(conversation.model, "audio", models)) {
        suggestMedia("audio", text);
        return;
      }
      await generateMusic(text);
      return;
    }
    if (files.length === 0 && isVideoGenerationPrompt(text)) {
      if (!modelSupportsMedia(conversation.model, "video", models)) {
        suggestMedia("video", text);
        return;
      }
      await generateVideo(text);
      return;
    }
    if (files.length === 0 && isImageGenerationPrompt(text)) {
      if (!modelSupportsMedia(conversation.model, "image", models)) {
        suggestMedia("image", text);
        return;
      }
      await generateImage(text);
      return;
    }
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

    const kinds = collectMediaKinds([{ role: "user", parts }]);
    const unsupported = kinds.find(
      (kind) => !modelSupportsMedia(conversation.model, kind, models),
    );
    if (unsupported) {
      const hint = capabilityHint(unsupported, models);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          parts,
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "text", text: hint.text }],
        },
      ]);
      return;
    }

    void sendMessage({ parts }, { body: { model: conversation.model, plugins } });
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
        parts: [{ type: "text", text: prompt }],
      },
    ]);
    setMediaBusy("son");
    toast.info("Génération du son en cours…");
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
        kind?: string;
      }>(response);
      if (!response.ok || !data.url || !data.mediaType) {
        throw new Error(data.error ?? "Audio impossible");
      }
      const audioPart: FileUIPart = {
        type: "file",
        filename: data.name ?? "audio.wav",
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
              text:
                data.kind === "soundscape"
                  ? "Voici le son demandé. Tu peux l’écouter ci-dessous (lecture en boucle)."
                  : "Morceau généré. Tu peux l’écouter ci-dessous.",
            },
            audioPart,
          ],
        },
      ]);
    } catch (musicError) {
      const message =
        musicError instanceof Error ? musicError.message : "Audio impossible";
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `Impossible de générer l’audio : ${message}`,
            },
          ],
        },
      ]);
    } finally {
      setMediaBusy(null);
    }
  }

  async function generateImage(prompt: string) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
    ]);
    setMediaBusy("image");
    toast.info("Génération d’image…");
    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await readApiJson<{
        error?: string;
        url?: string;
        preview?: string;
        name?: string;
        mediaType?: string;
      }>(response);
      if (!response.ok || !data.mediaType) {
        throw new Error(data.error ?? "Image impossible");
      }
      const imageUrl = data.preview ?? data.url;
      if (!imageUrl) {
        throw new Error(data.error ?? "Image impossible");
      }
      const imagePart: FileUIPart = {
        type: "file",
        filename: data.name ?? "image.png",
        mediaType: data.mediaType,
        url: imageUrl,
      };
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Voici l’image générée.",
            },
            imagePart,
          ],
        },
      ]);
    } catch (imageError) {
      const message =
        imageError instanceof Error ? imageError.message : "Image impossible";
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `Impossible de générer l’image : ${message}`,
            },
          ],
        },
      ]);
    } finally {
      setMediaBusy(null);
    }
  }

  async function generateVideo(prompt: string) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
    ]);
    setMediaBusy("video");
    toast.info("Génération de la vidéo… Seedance. Ça peut prendre une minute.");
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await readApiJson<{
        error?: string;
        url?: string;
        name?: string;
        mediaType?: string;
      }>(response);
      if (!response.ok || !data.url || !data.mediaType) {
        throw new Error(data.error ?? "Vidéo impossible");
      }
      const videoPart: FileUIPart = {
        type: "file",
        filename: data.name ?? "video.mp4",
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
              text: "Voici la vidéo générée.",
            },
            videoPart,
          ],
        },
      ]);
    } catch (videoError) {
      const message =
        videoError instanceof Error ? videoError.message : "Vidéo impossible";
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `Impossible de générer la vidéo : ${message}`,
            },
          ],
        },
      ]);
    } finally {
      setMediaBusy(null);
    }
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-6">
          <Empty className="max-w-lg border-none p-0 text-center sm:p-8">
            <EmptyHeader className="items-center text-center">
              <EmptyTitle className="text-pretty">Votre cloud IA, en local.</EmptyTitle>
              <EmptyDescription className="text-pretty">
                Choisis un modèle, puis parle-lui. Pour une image, un son ou
                une vidéo, filtre Images / Audio / Vidéo dans le sélecteur.
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
                  onClick={() => submitPrompt(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <ChatScroller follow={isBusy}>
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={
                isBusy &&
                message.role === "assistant" &&
                index === messages.length - 1
              }
              onAttachAudio={attachAudio}
            />
          ))}
          {mediaBusy === "image" ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Génération de l’image…
              </p>
              <ImageSkeleton />
            </div>
          ) : mediaBusy === "video" ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Génération de la vidéo… Seedance
              </p>
              <ImageSkeleton className="aspect-video w-full max-w-md" />
            </div>
          ) : status === "submitted" || mediaBusy ? (
            <p className="text-sm text-muted-foreground">
              {mediaBusy === "son" ? "Génération du son…" : "Réflexion…"}
            </p>
          ) : null}
        </ChatScroller>
      )}

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
