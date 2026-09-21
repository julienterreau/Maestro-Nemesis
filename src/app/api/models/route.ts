import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import {
  getOpenRouterCatalog,
  getPinnedCatalog,
} from "@/lib/openrouter-catalog";

export async function GET(request: Request) {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const full = new URL(request.url).searchParams.get("full") === "1";
  const models = full ? await getOpenRouterCatalog() : getPinnedCatalog();
  return NextResponse.json({ models, count: models.length, full });
}
