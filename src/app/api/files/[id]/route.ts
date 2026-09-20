import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { readUpload } from "@/lib/files";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const attachment = await prisma.attachment.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const bytes = await readUpload(attachment.storageKey);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
