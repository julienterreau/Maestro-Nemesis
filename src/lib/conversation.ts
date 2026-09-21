import type { Prisma } from "@/generated/prisma";
import type { UIMessage } from "ai";
import { DEFAULT_MODEL } from "@/lib/models";
import { prisma } from "@/lib/prisma";
import type { Conversation } from "@/lib/types";
import { titleFromPrompt } from "@/lib/storage";
import { getMessageText } from "@/lib/types";

export const MESSAGE_PAGE_SIZE = 50;

export function parseMessagePageLimit(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return parsed;
}

function toUiMessage(message: {
  id: string;
  role: string;
  parts: unknown;
}): UIMessage {
  return {
    id: message.id,
    role: message.role as UIMessage["role"],
    parts: message.parts as UIMessage["parts"],
  };
}

export function toClientConversation(row: {
  id: string;
  title: string;
  model: string;
  updatedAt: Date;
  messages?: Array<{ id: string; role: string; parts: unknown }>;
  loaded?: boolean;
  hasOlder?: boolean;
}): Conversation {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    updatedAt: row.updatedAt.getTime(),
    messages: (row.messages ?? []).map(toUiMessage),
    loaded: row.loaded ?? false,
    hasOlder: row.hasOlder ?? false,
  };
}

export async function listConversations(userId: string) {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      model: true,
      updatedAt: true,
    },
  });

  return rows.map((row) =>
    toClientConversation({ ...row, messages: [], loaded: false, hasOlder: false }),
  );
}

export async function createConversationRecord(userId: string, model = DEFAULT_MODEL) {
  const row = await prisma.conversation.create({
    data: {
      userId,
      model,
      title: "Nouvelle conversation",
    },
  });

  return toClientConversation({
    ...row,
    messages: [],
    loaded: true,
    hasOlder: false,
  });
}

export async function listConversationMessages(
  conversationId: string,
  userId: string,
  options: { before?: string; limit?: number } = {},
) {
  const requested = options.limit;
  const limit = Math.min(
    Math.max(requested && requested > 0 ? requested : MESSAGE_PAGE_SIZE, 1),
    MESSAGE_PAGE_SIZE,
  );
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!conversation) return null;

  let cursorCreatedAt: Date | undefined;
  if (options.before) {
    const cursor = await prisma.message.findFirst({
      where: { id: options.before, conversationId },
      select: { createdAt: true },
    });
    if (!cursor) {
      return { messages: [], hasMore: false };
    }
    cursorCreatedAt = cursor.createdAt;
  }

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      ...(cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();

  return {
    messages: page.map(toUiMessage),
    hasMore,
  };
}

export async function upsertConversationMessages(
  conversationId: string,
  userId: string,
  messages: UIMessage[],
  model?: string,
) {
  const firstUser = messages.find((message) => message.role === "user");
  const prompt = firstUser ? getMessageText(firstUser) : "";

  await prisma.$transaction(async (tx) => {
    const existing = await tx.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!existing) {
      throw new Error("Conversation introuvable.");
    }

    for (const message of messages) {
      await tx.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId,
          role: message.role,
          parts: message.parts as Prisma.InputJsonValue,
        },
        update: {
          role: message.role,
          parts: message.parts as Prisma.InputJsonValue,
        },
      });
    }

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        model: model ?? existing.model,
        title:
          existing.title === "Nouvelle conversation" && prompt
            ? titleFromPrompt(prompt)
            : existing.title,
      },
    });
  }, { timeout: 20_000 });
}
