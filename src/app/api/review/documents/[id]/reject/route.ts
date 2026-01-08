// src/app/api/review/documents/[documentId]/reject/route.ts
import { NextResponse } from "next/server";
;
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
import { auditLog } from "@/lib/audit";
import { DocumentClassificationStatus, DocumentSensitivity, UploaderType, UserRole } from "@/lib/db/enums";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.attorney]);

  const { reason } = await req.json().catch(() => ({}));
  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });
  }

  const { id: documentId } = await ctx.params;

  const { findUnique: findUniqueDoc, update: updateDoc, getDb } = await import("@/lib/db");
  
  type DocumentRecord = {
    id: string;
    clientId: string;
    fileType: string;
    sensitivityLevel: string;
    uploadedVia: string;
    createdAt: string;
    classificationStatus: string;
  };
  
  type InviteRecord = {
    id: string;
    clientId: string;
    createdAt: string;
  };
  
  const doc = await findUniqueDoc<DocumentRecord>("documents", { id: documentId });
  if (!doc) throw new HttpError(404, "Not found");

  await requireClientAccess({ 
    principal, 
    clientId: doc.clientId, 
    requireSensitive: doc.sensitivityLevel !== DocumentSensitivity.CONFIDENTIAL && doc.sensitivityLevel !== DocumentSensitivity.PUBLIC,
  });

  // Find invite if this was uploaded via invite
  let invite: InviteRecord | null = null;
  if (doc.uploadedVia === "CLIENT_INVITE_UPLOAD") {
    const db = getDb();
    const { data: invitesData } = await db
      .from("client_invites")
      .select("*")
      .eq("clientId", doc.clientId)
      .lte("createdAt", doc.createdAt)
      .order("createdAt", { ascending: false })
      .limit(1);
    
    invite = (invitesData && invitesData.length > 0) ? (invitesData[0] as InviteRecord) : null;
  }

  const updated = await updateDoc("documents", { id: doc.id }, {
    classificationStatus: DocumentClassificationStatus.REJECTED,
    policyholderMessage: reason.slice(0, 500),
  } as Record<string, unknown>) as DocumentRecord;

  await auditLog({
    actorType: principal.roles.includes("ADMIN") ? UploaderType.SYSTEM : UploaderType.ATTORNEY,
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
