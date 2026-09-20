"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { getMessageText } from "@/lib/types";

export function ChatMessage({
  message,
  isStreaming = false,
}: {
  message: UIMessage;
  isStreaming?: boolean;
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble variant="default" align="end">
            <BubbleContent>{getMessageText(message)}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  const text = getMessageText(message);

  return (
    <Message align="start">
      <MessageContent>
        <Bubble variant="ghost" align="start">
          <BubbleContent>
            {text.trim() ? (
              <div className="space-y-3 [&_a]:underline [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            ) : isStreaming ? (
              <span className="text-muted-foreground">Réflexion…</span>
            ) : null}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
