// src/app/api/documents/[documentId]/original/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
import { getSignedObjectUrl } from "@/lib/storage";
import { logDocumentAccess } from "@/lib/accessLog";
import { DocumentSensitivity, UploaderType, UserRole } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);

  const { reason } = await req.json().catch(() => ({}));
  if (!reason || typeof reason !== "string" || reason.length < 5) {
    return NextResponse.json({ error: "Access reason required (minimum 5 characters)" }, { status: 400 });
  }

  const { documentId } = await ctx.params;

  const doc = await prisma.documents.findUnique({
    where: { id: documentId },
  });
  if (!doc) throw new HttpError(404, "Not found");

  // Only sensitive docs require this endpoint
  if (
    doc.sensitivityLevel !== DocumentSensitivity.S4_HIGHLY_SENSITIVE &&
    doc.sensitivityLevel !== DocumentSensitivity.S5_LEGAL_CASE
  ) {
    return NextResponse.json({ error: "Use preview endpoint" }, { status: 400 });
  }

  await requireClientAccess({
    principal,
    clientId: doc.clientId,
    requireSensitive: true,
  });

  const signedUrl = await getSignedObjectUrl(doc.filePath, 30);

  await logDocumentAccess({
    documentId: doc.id,
    actorType: principal.role === UserRole.ADMIN ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: principal.dbUserId,
    action: "VIEW_ORIGINAL",
    reason: reason.slice(0, 300),
  });

  return NextResponse.json({ url: signedUrl });
}

