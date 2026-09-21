import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { listConversationMessages, parseMessagePageLimit } from "@/lib/conversation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const before = url.searchParams.get("before") ?? undefined;
  const page = await listConversationMessages(id, session.user.id, {
    before,
    limit: parseMessagePageLimit(url.searchParams.get("limit")),
  });

  if (!page) {
    return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  return NextResponse.json(page);
}
