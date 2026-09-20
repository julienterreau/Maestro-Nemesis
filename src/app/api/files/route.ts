import { NextResponse } from "next/server";
import { getRequiredAdmin } from "@/lib/auth-user";
import {
  fileUrl,
  inferMimeType,
  isAllowedFile,
  MAX_FILE_SIZE,
  saveUpload,
} from "@/lib/files";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getRequiredAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }

  const mimeType = inferMimeType(file.name, file.type);

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop lourd (25 Mo max)." }, { status: 400 });
  }

  if (!isAllowedFile(mimeType)) {
    return NextResponse.json({ error: "Type de fichier non autorisé." }, { status: 400 });
  }

  const attachment = await prisma.attachment.create({
    data: {
      userId: session.user.id,
      name: file.name,
      mimeType,
      size: file.size,
      storageKey: crypto.randomUUID(),
    },
  });

  await saveUpload(attachment.storageKey, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    id: attachment.id,
    name: attachment.name,
    mediaType: attachment.mimeType,
    url: fileUrl(attachment.id),
    size: attachment.size,
  });
}
