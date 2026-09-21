"use client";

import type { UIMessage } from "ai";
import { create } from "zustand";
import { DEFAULT_MODEL, PINNED_MODELS, type CatalogModel } from "@/lib/models";
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
  catalogFull: boolean;
  catalogLoading: boolean;
  plugins: RouterPlugins;
  load: () => Promise<void>;
  loadLatest: (id: string) => Promise<void>;
  ensureCatalog: () => Promise<void>;
  create: () => Promise<void>;
  select: (id: string) => void;
  remove: (id: string) => Promise<void>;
  setModel: (id: string, model: string) => Promise<void>;
  setPlugin: (key: keyof RouterPlugins, value: boolean) => void;
  setMessages: (id: string, messages: UIMessage[]) => void;
  setHasOlder: (id: string, hasOlder: boolean) => void;
  persist: (id: string) => Promise<void>;
};

const latestInflight = new Set<string>();

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.ok ? "Réponse vide du serveur." : `Erreur ${response.status}`,
    );
  }
  let data: T & { error?: string };
  try {
    data = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error("Réponse serveur invalide.");
  }
  if (!response.ok) {
    throw new Error(data.error ?? "Erreur API");
  }
  return data;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeId: "",
  loading: false,
  configured: null,
  models: PINNED_MODELS,
  catalogFull: false,
  catalogLoading: false,
  plugins: DEFAULT_PLUGINS,
  setPlugin: (key, value) => {
    const plugins = { ...get().plugins, [key]: value };
    set({ plugins });
    window.localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
  },
  load: async () => {
    try {
      const [conversations, chat] = await Promise.all([
        parseJson<{ conversations: Conversation[] }>(
          await fetch("/api/conversations"),
        ),
        parseJson<{ configured: boolean }>(await fetch("/api/chat")),
      ]);

      const list = conversations.conversations;
      const previous = get().conversations;
      const merged = list.map((item) => {
        const current = previous.find((entry) => entry.id === item.id);
        return current?.loaded ? current : item;
      });
      set({
        conversations: merged,
        activeId: get().activeId || merged[0]?.id || "",
        configured: chat.configured,
        plugins: loadPlugins(),
        loading: false,
      });
    } catch {
      set({ loading: false });
      throw new Error("Impossible de charger les conversations.");
    }
  },
  loadLatest: async (id) => {
    const current = get().conversations.find((item) => item.id === id);
    if (!current || current.loaded || latestInflight.has(id)) return;
    latestInflight.add(id);
    try {
      const page = await parseJson<{ messages: UIMessage[]; hasMore: boolean }>(
        await fetch(`/api/conversations/${id}`),
      );
      set((state) => ({
        conversations: state.conversations.map((item) =>
          item.id === id
            ? {
                ...item,
                messages: page.messages ?? [],
                loaded: true,
                hasOlder: Boolean(page.hasMore),
              }
            : item,
        ),
      }));
    } catch {
      set((state) => ({
        conversations: state.conversations.map((item) =>
          item.id === id ? { ...item, loaded: true, hasOlder: false } : item,
        ),
      }));
    } finally {
      latestInflight.delete(id);
    }
  },
  ensureCatalog: async () => {
    if (get().catalogFull || get().catalogLoading) return;
    set({ catalogLoading: true });
    try {
      const catalog = await parseJson<{ models: CatalogModel[] }>(
        await fetch("/api/models?full=1"),
      );
      if (catalog.models.length > 0) {
        set({ models: catalog.models, catalogFull: true, catalogLoading: false });
      } else {
        set({ catalogFull: true, catalogLoading: false });
      }
    } catch {
      set({ catalogLoading: false });
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
        item.id === id ? { ...item, messages, updatedAt: Date.now() } : item,
      ),
    }));
  },
  setHasOlder: (id, hasOlder) => {
    set((state) => ({
      conversations: state.conversations.map((item) =>
        item.id === id ? { ...item, hasOlder } : item,
      ),
    }));
  },
  persist: async (id) => {
    const conversation = get().conversations.find((item) => item.id === id);
    if (!conversation?.loaded) return;
    if (conversation.messages.length === 0) return;
    try {
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
    } catch {
      // La persistance se retentera au prochain changement.
    }
  },
}));
