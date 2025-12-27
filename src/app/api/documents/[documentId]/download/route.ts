// src/app/api/documents/[documentId]/download/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { getSignedObjectUrl } from "@/lib/storage";
import { logDocumentAccess } from "@/lib/accessLog";
import { UploaderType } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await req.json().catch(() => ({}));
  if (!reason || typeof reason !== "string" || reason.length < 5) {
    return NextResponse.json({ error: "Reason required (minimum 5 characters)" }, { status: 400 });
  }

  const { documentId } = await ctx.params;

  const doc = await prisma.documents.findUnique({ where: { id: documentId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signedUrl = await getSignedObjectUrl(doc.filePath, 30);

  await logDocumentAccess({
    documentId: doc.id,
    actorType: user.roles.includes("ADMIN") ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: user.id,
    action: "DOWNLOAD",
    reason: reason.slice(0, 300),
  });

  return NextResponse.json({ url: signedUrl });
}

