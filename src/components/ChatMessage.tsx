"use client";

import { Volume2Icon } from "lucide-react";
import { useState } from "react";
import type { FileUIPart, UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { AttachmentCard, AttachmentCardRow } from "@/components/AttachmentCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { readApiJson } from "@/lib/api-json";
import { getMessageText } from "@/lib/types";

function FileParts({ message }: { message: UIMessage }) {
  const files = message.parts.filter((part): part is FileUIPart => part.type === "file");
  if (files.length === 0) return null;
  const audioFiles = files.filter((file) => file.mediaType.startsWith("audio/"));

  return (
    <div className="flex flex-col items-start gap-2">
      <AttachmentCardRow>
        {files.map((file, index) => (
          <a
            key={`${file.url}-${index}`}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <AttachmentCard
              src={file.url}
              name={file.filename ?? "Fichier"}
              mediaType={file.mediaType}
            />
          </a>
        ))}
      </AttachmentCardRow>
      {audioFiles.map((file, index) => (
        <AudioPlayer
          key={`${file.url}-player-${index}`}
          src={file.url}
          label={file.filename ?? "Audio"}
        />
      ))}
    </div>
  );
}

export function ChatMessage({
  message,
  isStreaming = false,
  onAttachAudio,
}: {
  message: UIMessage;
  isStreaming?: boolean;
  onAttachAudio?: (messageId: string, file: FileUIPart) => void;
}) {
  const text = getMessageText(message);
  const [speaking, setSpeaking] = useState(false);
  const hasAudio = message.parts.some(
    (part) => part.type === "file" && part.mediaType.startsWith("audio/"),
  );

  async function listen() {
    if (!text.trim() || speaking) return;
    setSpeaking(true);
    try {
      const response = await fetch("/api/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 4000) }),
      });
      const data = await readApiJson<{
        error?: string;
        url?: string;
        name?: string;
        mediaType?: string;
      }>(response);
      if (!response.ok || !data.url || !data.mediaType) {
        throw new Error(data.error ?? "Lecture impossible");
      }
      onAttachAudio?.(message.id, {
        type: "file",
        filename: data.name ?? "voix.mp3",
        mediaType: data.mediaType,
        url: data.url,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture impossible");
    } finally {
      setSpeaking(false);
    }
  }

  if (message.role === "user") {
    return (
      <Message align="start">
        <MessageContent className="items-start">
          <Bubble variant="muted" align="start">
            <BubbleContent className="flex flex-col items-start">
              <FileParts message={message} />
              {text ? <p className="text-left">{text}</p> : null}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message align="start">
      <MessageContent className="items-start">
        <Bubble variant="ghost" align="start">
          <BubbleContent className="flex flex-col items-start gap-3">
            {text.trim() ? (
              <div className="space-y-3 [&_a]:underline [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            ) : isStreaming ? (
              <span className="text-muted-foreground">Réflexion…</span>
            ) : null}
            <FileParts message={message} />
            {!isStreaming && text.trim() && !hasAudio ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={speaking}
                onClick={() => void listen()}
              >
                <Volume2Icon />
                {speaking ? "Génération de la voix…" : "Écouter"}
              </Button>
            ) : null}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
