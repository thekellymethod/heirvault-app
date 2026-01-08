// src/lib/accessLog.ts
;
import { UploaderType } from "@/lib/db/enums";
import crypto from "crypto";

type UploaderTypeValue = typeof UploaderType[keyof typeof UploaderType];

export async function logDocumentAccess(params: {
  documentId: string;
  actorType: UploaderTypeValue;
  actorId?: string | null;
  action: "VIEW_PREVIEW" | "VIEW_ORIGINAL" | "DOWNLOAD";
  reason?: string | null;
}) {
  // Use Supabase to create document access event
  const { create } = await import("@/lib/db");
  await create("document_access_events_v2", {
    id: crypto.randomUUID(),
    documentId: params.documentId,
    actorType: params.actorType,
    actorId: params.actorId ?? null,
    action: params.action,
    reason: params.reason ?? null,
    createdAt: new Date().toISOString(),
  });
}
