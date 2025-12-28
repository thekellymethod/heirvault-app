// src/app/api/review/documents/[documentId]/reject/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
import { auditLog } from "@/lib/audit";
import { DocumentClassificationStatus, DocumentSensitivity, UploaderType, UserRole } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);

  const { reason } = await req.json().catch(() => ({}));
  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });
  }

  const { id: documentId } = await ctx.params;

  const doc = await prisma.documents.findUnique({ 
    where: { id: documentId },
    select: { id: true, clientId: true, fileType: true, sensitivityLevel: true, uploadedVia: true, createdAt: true },
  });
  if (!doc) throw new HttpError(404, "Not found");

  await requireClientAccess({ 
    principal, 
    clientId: doc.clientId, 
    requireSensitive: doc.sensitivityLevel !== DocumentSensitivity.S2_INTERNAL && doc.sensitivityLevel !== DocumentSensitivity.S1_PUBLIC,
  });

  // Find invite if this was uploaded via invite
  const invite = doc.uploadedVia === "CLIENT_INVITE_UPLOAD"
    ? await prisma.client_invites.findFirst({
        where: {
          clientId: doc.clientId,
          createdAt: { lte: doc.createdAt },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const updated = await prisma.documents.update({
    where: { id: doc.id },
    data: { classificationStatus: DocumentClassificationStatus.REJECTED },
  });

  await auditLog({
    actorType: principal.role === UserRole.ADMIN ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: principal.dbUserId,
    clientId: doc.clientId,
    inviteId: invite?.id ?? null,
    action: "DOC_REJECTED",
    metadata: {
      documentId: doc.id,
      docType: doc.fileType,
      sensitivity: doc.sensitivityLevel,
      reason: reason.slice(0, 300),
    },
  });

  return NextResponse.json({ ok: true, status: updated.classificationStatus });
}
