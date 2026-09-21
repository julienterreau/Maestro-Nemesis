import type { UIMessage } from "ai";

export type Conversation = {
  id: string;
  title: string;
  model: string;
  messages: UIMessage[];
  updatedAt: number;
  loaded: boolean;
  hasOlder: boolean;
};

export function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}
