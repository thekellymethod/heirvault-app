// src/app/api/review/documents/[documentId]/reject/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { DocumentClassificationStatus, DocumentSensitivity } from "@prisma/client";
import crypto from "crypto";

function docReasonSafe(reason: unknown) {
  // Keep it simple; avoid leaking sensitive content into logs if someone pastes PII
  if (typeof reason === "string") return { note: reason.slice(0, 300) };
  return {};
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await req.json().catch(() => ({}));
  const { id: documentId } = await ctx.params;

  const doc = await prisma.documents.update({
    where: { id: documentId },
    data: {
      classificationStatus: DocumentClassificationStatus.REJECTED,
      // Note: Add reviewedByUserId, reviewedAt, and confidenceReason fields if they exist
      extractedData: { ...docReasonSafe(reason), rejectedReason: reason ?? "Rejected" },
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
        reason: reason ?? "Document rejection review",
        ipAddress: null,
        userAgent: null,
      },
    });
  }

  await auditLog({
    actorType: user.roles.includes("ADMIN") ? "ADMIN" : "ATTORNEY",
    actorId: user.id,
    clientId: doc.clientId,
    inviteId: null,
    action: "DOC_REJECTED",
    metadata: { documentId, reason: reason ?? null },
  });

  return NextResponse.json({ ok: true });
}

