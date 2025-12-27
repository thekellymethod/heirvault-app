// src/app/api/review/documents/[documentId]/approve/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { tryCompleteInvite } from "@/lib/inviteCompletion";
import { supersedePriorVersions } from "@/lib/versioning";
import { DocumentClassificationStatus, DocumentSensitivity } from "@prisma/client";
import crypto from "crypto";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: documentId } = await ctx.params;

  // Get document first to check inviteId
  const docBefore = await prisma.documents.findUnique({
    where: { id: documentId },
    select: { clientId: true, filePath: true, uploadedVia: true, createdAt: true },
  });

  if (!docBefore) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Find invite if this was uploaded via invite
  const invite = docBefore.uploadedVia === "CLIENT_INVITE_UPLOAD"
    ? await prisma.client_invites.findFirst({
        where: {
          clientId: docBefore.clientId,
          createdAt: { lte: docBefore.createdAt },
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const doc = await prisma.documents.update({
    where: { id: documentId },
    data: {
      classificationStatus: DocumentClassificationStatus.APPROVED,
      // Note: Add reviewedByUserId and reviewedAt fields if they exist in your schema
    },
  });

  // Log access for S4/S5 documents
  if (doc.sensitivityLevel === DocumentSensitivity.S4_HIGHLY_SENSITIVE || 
      doc.sensitivityLevel === DocumentSensitivity.S5_LEGAL_CASE) {
    await prisma.document_access_events.create({
      data: {
        id: crypto.randomUUID(),
        documentId: doc.id,
        userId: user.id,
        accessType: "FULL_ACCESS",
        reason: "Document approval review",
        ipAddress: null, // Add from request headers if needed
        userAgent: null,
      },
    });
  }

  await auditLog({
    actorType: user.roles.includes("ADMIN") ? "ADMIN" : "ATTORNEY",
    actorId: user.id,
    clientId: doc.clientId,
    inviteId: invite?.id ?? null,
    action: "DOC_APPROVED",
    metadata: { documentId },
  });

  // Try to complete invite if all documents are accepted
  if (invite) {
    await tryCompleteInvite(invite.id);
  }

  // Supersede prior versions if document was approved
  await supersedePriorVersions(doc.id);

  return NextResponse.json({ ok: true });
}

