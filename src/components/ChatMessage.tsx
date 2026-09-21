"use client";

import { CheckIcon, CopyIcon, Volume2Icon } from "lucide-react";
import { isValidElement, useState, type ReactNode } from "react";
import type { FileUIPart, UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { AttachmentCard, AttachmentCardRow } from "@/components/AttachmentCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { GeneratedImage } from "@/components/GeneratedImage";
import { Button } from "@/components/ui/button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { readApiJson } from "@/lib/api-json";
import { getMessageText } from "@/lib/types";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode }).children;
    return children ? nodeText(children) : "";
  }
  return "";
}

async function copyToClipboard(value: string, ok = "Markdown copié") {
  await navigator.clipboard.writeText(value);
  toast.success(ok);
}

function CopyButton({
  value,
  label = "Copier",
  copiedLabel = "Copié",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="cursor-pointer"
      onClick={async () => {
        try {
          await copyToClipboard(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Copie impossible");
        }
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? copiedLabel : label}
    </Button>
  );
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const value = nodeText(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);

  return (
    <div className="group/code relative">
      <button
        type="button"
        className="absolute top-2 right-2 z-10 flex size-7 cursor-pointer items-center justify-center rounded-xl border border-border bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Copier le code"
        onClick={async () => {
          try {
            await copyToClipboard(value, "Code copié");
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            toast.error("Copie impossible");
          }
        }}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </button>
      <pre className="overflow-x-auto rounded-xl bg-muted p-3 pr-12">{children}</pre>
    </div>
  );
}

function FileParts({ message }: { message: UIMessage }) {
  const files = message.parts.filter((part): part is FileUIPart => part.type === "file");
  if (files.length === 0) return null;
  const audioFiles = files.filter((file) => file.mediaType.startsWith("audio/"));
  const imageFiles = files.filter((file) => file.mediaType.startsWith("image/"));
  const otherFiles = files.filter(
    (file) =>
      !file.mediaType.startsWith("audio/") && !file.mediaType.startsWith("image/"),
  );

  return (
    <div className="flex w-full flex-col items-start gap-2">
      {imageFiles.map((file, index) => (
        <GeneratedImage
          key={`${file.url}-img-${index}`}
          src={file.url}
          alt={file.filename ?? "Image"}
        />
      ))}
      {otherFiles.length > 0 ? (
        <AttachmentCardRow>
          {otherFiles.map((file, index) => (
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
      ) : null}
      {audioFiles.map((file, index) => (
        <AudioPlayer
          key={`${file.url}-player-${index}`}
          src={file.url}
          label={file.filename ?? "Audio"}
          loop={Boolean(file.filename?.startsWith("ambiance-"))}
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
              <div className="w-full max-w-full space-y-3 [&_a]:underline [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                  }}
                >
                  {text}
                </ReactMarkdown>
              </div>
            ) : isStreaming ? (
              <span className="text-muted-foreground">Réflexion…</span>
            ) : null}
            <FileParts message={message} />
            {!isStreaming && text.trim() ? (
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton value={text} label="Copier" />
                {!hasAudio ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={speaking}
                    onClick={() => void listen()}
                  >
                    <Volume2Icon />
                    {speaking ? "Génération de la voix…" : "Écouter"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
