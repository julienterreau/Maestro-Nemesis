import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import {
  createConversationRecord,
  listConversations,
} from "@/lib/conversation";
import { DEFAULT_MODEL, isModelId } from "@/lib/models";

export async function GET() {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let conversations = await listConversations(session.user.id);
  if (conversations.length === 0) {
    conversations = [await createConversationRecord(session.user.id)];
  }

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let model = DEFAULT_MODEL;
  try {
    const body = (await request.json()) as { model?: string };
    if (typeof body.model === "string" && isModelId(body.model)) {
      model = body.model;
    }
  } catch {
    // keep default
  }

  const conversation = await createConversationRecord(session.user.id, model);
  return NextResponse.json({ conversation });
}
