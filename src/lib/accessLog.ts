// src/lib/accessLog.ts
;
import { UploaderType } from "@/lib/db/enums";
import crypto from "crypto";

export async function logDocumentAccess(params: {
  documentId: string;
  actorType: UploaderType;
  actorId?: string | null;
  action: "VIEW_PREVIEW" | "VIEW_ORIGINAL" | "DOWNLOAD";
  reason?: string | null;
}) {
  // Use the new DocumentAccessEvent model (mapped to document_access_events_v2 table)
  // After running migration and regenerating Prisma client, replace with:
  // await prisma.documentAccessEvent.create({
  //   data: {
  //     id: crypto.randomUUID(),
  //     documentId: params.documentId,
  //     actorType: params.actorType,
  //     actorId: params.actorId ?? null,
  //     action: params.action,
  //     reason: params.reason ?? null,
  //   },
  // });
  
  // Temporary: using raw SQL until migration is run and Prisma client is regenerated
  await prisma.$executeRawUnsafe(
    `INSERT INTO document_access_events_v2 (id, document_id, actor_type, actor_id, action, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    crypto.randomUUID(),
    params.documentId,
    params.actorType,
    params.actorId ?? null,
    params.action,
    params.reason ?? null
  );
}
