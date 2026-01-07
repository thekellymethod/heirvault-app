// src/lib/inviteCompletion.ts
;
import { DocumentClassificationStatus } from "@/lib/db/enums";

export async function tryCompleteInvite(inviteId: string) {
  const { findUnique, update: updateDb } = await import("@/lib/db");
  
  const invite = await findUnique("client_invites", { id: inviteId });

  if (!invite) return;

  // Get documents for this invite
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  
  // Fetch documents with date filter
  type InviteRecord = {
    id: string;
    clientId: string;
    createdAt: string;
  };
  
  type DocumentRecord = {
    id: string;
    clientId: string;
    uploadedVia: string;
    classificationStatus: string;
    createdAt: string;
  };
  
  const inviteRecord = invite as InviteRecord;
  const inviteCreatedAt = inviteRecord.createdAt;
  
  let docsQuery = db.from("documents").select("*");
  docsQuery = docsQuery.eq("clientId", inviteRecord.clientId);
  docsQuery = docsQuery.eq("uploadedVia", "CLIENT_INVITE_UPLOAD");
  if (inviteCreatedAt) {
    docsQuery = docsQuery.gte("createdAt", inviteCreatedAt);
  }
  
  const { data: docs, error: docsError } = await docsQuery;
  if (docsError) throw docsError;

  if (!docs || docs.length === 0) return;

  const allAccepted = (docs as DocumentRecord[]).every((d) =>
    d.classificationStatus === DocumentClassificationStatus.APPROVED ||
    d.classificationStatus === DocumentClassificationStatus.AUTO_ACCEPTED
  );

  if (allAccepted) {
    type ClientInviteUpdate = {
      status: string;
      updatedAt: string;
    };
    await updateDb<ClientInviteUpdate>("client_invites", { id: inviteId }, {
      status: "COMPLETED",
      updatedAt: new Date().toISOString(),
    });
  }
}

