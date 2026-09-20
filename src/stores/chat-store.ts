"use client";

import type { UIMessage } from "ai";
import { create } from "zustand";
import { DEFAULT_MODEL, FEATURED_MODELS, type CatalogModel } from "@/lib/models";
import {
  DEFAULT_PLUGINS,
  parseRouterPlugins,
  type RouterPlugins,
} from "@/lib/openrouter-plugins";
import type { Conversation } from "@/lib/types";

const PLUGINS_KEY = "ai-cloud-local.plugins";

function loadPlugins(): RouterPlugins {
  if (typeof window === "undefined") return DEFAULT_PLUGINS;
  try {
    return parseRouterPlugins(JSON.parse(window.localStorage.getItem(PLUGINS_KEY) ?? "{}"));
  } catch {
    return DEFAULT_PLUGINS;
  }
}

type ChatStore = {
  conversations: Conversation[];
  activeId: string;
  loading: boolean;
  configured: boolean | null;
  models: CatalogModel[];
  plugins: RouterPlugins;
  load: () => Promise<void>;
  create: () => Promise<void>;
  select: (id: string) => void;
  remove: (id: string) => Promise<void>;
  setModel: (id: string, model: string) => Promise<void>;
  setPlugin: (key: keyof RouterPlugins, value: boolean) => void;
  setMessages: (id: string, messages: UIMessage[]) => void;
  persist: (id: string) => Promise<void>;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Erreur API");
  }
  return data;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeId: "",
  loading: true,
  configured: null,
  models: FEATURED_MODELS,
  plugins: DEFAULT_PLUGINS,
  setPlugin: (key, value) => {
    const plugins = { ...get().plugins, [key]: value };
    set({ plugins });
    window.localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
  },
  load: async () => {
    set({ loading: true });
    try {
      const [conversations, chat, catalog] = await Promise.all([
        parseJson<{ conversations: Conversation[] }>(
          await fetch("/api/conversations"),
        ),
        parseJson<{ configured: boolean }>(await fetch("/api/chat")),
        parseJson<{ models: CatalogModel[] }>(await fetch("/api/models")).catch(
          () => ({ models: FEATURED_MODELS }),
        ),
      ]);

      const list = conversations.conversations;
      set({
        conversations: list,
        activeId: list[0]?.id ?? "",
        configured: chat.configured,
        models: catalog.models.length > 0 ? catalog.models : FEATURED_MODELS,
        plugins: loadPlugins(),
        loading: false,
      });
    } catch {
      set({ loading: false });
      throw new Error("Impossible de charger les conversations.");
    }
  },
  create: async () => {
    const { conversation } = await parseJson<{ conversation: Conversation }>(
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: get().conversations.find((item) => item.id === get().activeId)
            ?.model ?? DEFAULT_MODEL,
        }),
      }),
    );
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeId: conversation.id,
    }));
  },
  select: (id) => set({ activeId: id }),
  remove: async (id) => {
    await parseJson(await fetch(`/api/conversations/${id}`, { method: "DELETE" }));
    set((state) => {
      const remaining = state.conversations.filter((item) => item.id !== id);
      return {
        conversations: remaining,
        activeId: state.activeId === id ? (remaining[0]?.id ?? "") : state.activeId,
      };
    });
    if (get().conversations.length === 0) {
      await get().create();
    }
  },
  setModel: async (id, model) => {
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item.id === id ? { ...item, model } : item,
      ),
    }));
    await parseJson(
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      }),
    );
  },
  setMessages: (id, messages) => {
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item.id === id
          ? { ...item, messages, updatedAt: Date.now() }
          : item,
      ),
    }));
  },
  persist: async (id) => {
    const conversation = get().conversations.find((item) => item.id === id);
    if (!conversation) return;
    await parseJson(
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.messages,
          model: conversation.model,
        }),
      }),
    );
  },
}));
