import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { replaceConversationMessages } from "@/lib/conversation";
import { isModelId } from "@/lib/models";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    messages?: UIMessage[];
    model?: string;
    title?: string;
  };

  const existing = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  if (Array.isArray(body.messages)) {
    await replaceConversationMessages(
      id,
      session.user.id,
      body.messages,
      typeof body.model === "string" && isModelId(body.model)
        ? body.model
        : existing.model,
    );
  } else if (typeof body.model === "string" && isModelId(body.model)) {
    await prisma.conversation.update({
      where: { id },
      data: { model: body.model },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.conversation.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
