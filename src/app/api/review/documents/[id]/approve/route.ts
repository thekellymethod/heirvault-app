// src/app/api/review/documents/[documentId]/approve/route.ts
import { NextResponse } from "next/server";
;
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
import { auditLog } from "@/lib/audit";
import { supersedePriorVersions } from "@/lib/versioning";
import { tryCompleteInvite } from "@/lib/inviteCompletion";
import { DocumentClassificationStatus, DocumentSensitivity, UploaderType, UserRole } from "@/lib/db/enums";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.attorney]);

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

  // Find invite if this was uploaded via invite (documents don't have inviteId directly)
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
    classificationStatus: DocumentClassificationStatus.APPROVED,
  }) as DocumentRecord;

  await auditLog({
    actorType: principal.roles.includes("ADMIN") ? UploaderType.SYSTEM : UploaderType.ATTORNEY,
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

