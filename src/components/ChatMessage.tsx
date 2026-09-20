"use client";

import type { FileUIPart, UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AttachmentCard, AttachmentCardRow } from "@/components/AttachmentCard";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { getMessageText } from "@/lib/types";

function FileParts({ message }: { message: UIMessage }) {
  const files = message.parts.filter((part): part is FileUIPart => part.type === "file");
  if (files.length === 0) return null;

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
      {files.some((file) => file.mediaType.startsWith("audio/")) ? (
        <div className="flex w-full flex-col items-start gap-2">
          {files
            .filter((file) => file.mediaType.startsWith("audio/"))
            .map((file, index) => (
              <audio
                key={`${file.url}-player-${index}`}
                controls
                src={file.url}
                className="w-full max-w-xs"
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

export function ChatMessage({
  message,
  isStreaming = false,
}: {
  message: UIMessage;
  isStreaming?: boolean;
}) {
  const text = getMessageText(message);

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
          <BubbleContent className="flex flex-col items-start">
            {text.trim() ? (
              <div className="space-y-3 [&_a]:underline [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            ) : isStreaming ? (
              <span className="text-muted-foreground">Réflexion…</span>
            ) : null}
            <FileParts message={message} />
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
