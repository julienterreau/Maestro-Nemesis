import type { Prisma } from "@/generated/prisma";
import type { UIMessage } from "ai";
import { DEFAULT_MODEL } from "@/lib/models";
import { prisma } from "@/lib/prisma";
import type { Conversation } from "@/lib/types";
import { titleFromPrompt } from "@/lib/storage";
import { getMessageText } from "@/lib/types";

export function toClientConversation(row: {
  id: string;
  title: string;
  model: string;
  updatedAt: Date;
  messages?: Array<{ id: string; role: string; parts: unknown }>;
}): Conversation {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    updatedAt: row.updatedAt.getTime(),
    messages: (row.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role as UIMessage["role"],
      parts: message.parts as UIMessage["parts"],
    })),
  };
}

export async function listConversations(userId: string) {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return rows.map(toClientConversation);
}

export async function createConversationRecord(userId: string, model = DEFAULT_MODEL) {
  const row = await prisma.conversation.create({
    data: {
      userId,
      model,
      title: "Nouvelle conversation",
    },
    include: { messages: true },
  });

  return toClientConversation(row);
}

export async function replaceConversationMessages(
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

    await tx.message.deleteMany({ where: { conversationId } });
    if (messages.length > 0) {
      await tx.message.createMany({
        data: messages.map((message) => ({
          id: message.id,
          conversationId,
          role: message.role,
          parts: message.parts as Prisma.InputJsonValue,
        })),
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
  });
}
