// src/app/api/review/documents/[documentId]/approve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
import { auditLog } from "@/lib/audit";
import { supersedePriorVersions } from "@/lib/versioning";
import { tryCompleteInvite } from "@/lib/inviteCompletion";
import { DocumentClassificationStatus, DocumentSensitivity, UploaderType, UserRole } from "@prisma/client";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);

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

  // Find invite if this was uploaded via invite (documents don't have inviteId directly)
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
    data: { classificationStatus: DocumentClassificationStatus.APPROVED },
  });

  await auditLog({
    actorType: principal.role === UserRole.ADMIN ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: principal.dbUserId,
    clientId: doc.clientId,
    inviteId: invite?.id ?? null,
    action: "DOC_APPROVED",
    metadata: { documentId: doc.id, docType: doc.fileType, sensitivity: doc.sensitivityLevel },
  });

  // Only supersede older versions after acceptance
  await supersedePriorVersions(doc.id);

  // Invite completion (if this doc is tied to an invite flow)
  if (invite) await tryCompleteInvite(invite.id);

  return NextResponse.json({ ok: true, status: updated.classificationStatus });
}

