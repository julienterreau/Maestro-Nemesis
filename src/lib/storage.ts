import { DEFAULT_MODEL } from "@/lib/models";
import type { Conversation } from "@/lib/types";
import type { UIMessage } from "ai";

const STORAGE_KEY = "ai-cloud-local.conversations";

export function createConversation(model = DEFAULT_MODEL): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "Nouvelle conversation",
    model,
    messages: [],
    updatedAt: Date.now(),
    loaded: true,
    hasOlder: false,
  };
}

function normalizeMessage(message: unknown): UIMessage | null {
  if (!message || typeof message !== "object") return null;

  const value = message as {
    id?: unknown;
    role?: unknown;
    parts?: unknown;
    content?: unknown;
  };

  if (value.role !== "user" && value.role !== "assistant") return null;

  const id = typeof value.id === "string" ? value.id : crypto.randomUUID();

  if (Array.isArray(value.parts)) {
    return {
      id,
      role: value.role,
      parts: value.parts as UIMessage["parts"],
    };
  }

  if (typeof value.content === "string") {
    return {
      id,
      role: value.role,
      parts: [{ type: "text", text: value.content }],
    };
  }

  return null;
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const value = item as Partial<Conversation> & { messages?: unknown };
        if (typeof value.id !== "string") return null;

        return {
          id: value.id,
          title:
            typeof value.title === "string" ? value.title : "Nouvelle conversation",
          model: typeof value.model === "string" ? value.model : DEFAULT_MODEL,
          messages: Array.isArray(value.messages)
            ? value.messages
                .map(normalizeMessage)
                .filter((message): message is UIMessage => message !== null)
            : [],
          updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
          loaded: true as boolean,
          hasOlder: false as boolean,
        } satisfies Conversation;
      })
      .filter((conversation): conversation is Conversation => conversation !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (!compact) return "Nouvelle conversation";
  return compact.length > 42 ? `${compact.slice(0, 42)}…` : compact;
}
