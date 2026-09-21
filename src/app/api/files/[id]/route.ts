import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import { readUpload } from "@/lib/files";
import { prisma } from "@/lib/prisma";

function fileResponse(bytes: Buffer, mimeType: string, name: string) {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

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
    select: {
      id: true,
      name: true,
      mimeType: true,
      storageKey: true,
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  try {
    const bytes = await readUpload(attachment.storageKey);
    return fileResponse(bytes, attachment.mimeType, attachment.name);
  } catch {
    const withBytes = await prisma.attachment.findFirst({
      where: { id, userId: session.user.id },
      select: { bytes: true, name: true, mimeType: true },
    });
    if (!withBytes?.bytes || withBytes.bytes.length === 0) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }
    return fileResponse(
      Buffer.from(withBytes.bytes),
      withBytes.mimeType,
      withBytes.name,
    );
  }
}
