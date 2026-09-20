import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { getOpenRouterCatalog } from "@/lib/openrouter-catalog";

export async function GET() {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const models = await getOpenRouterCatalog();
  return NextResponse.json({ models, count: models.length });
}
