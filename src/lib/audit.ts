// src/lib/audit.ts
import { AuditAction } from "@/lib/db";
// Prisma removed - database access needs to be implemented
import crypto from "crypto";

// Note: This uses UploaderType from Prisma. If your schema uses a different enum name,
// adjust accordingly. For now, we'll use a string type that matches the Prisma enum.
type UploaderType = "POLICYHOLDER" | "ATTORNEY" | "ADMIN" | "SYSTEM";

type AuditParams = {
  actorType: UploaderType;
  actorId?: string | null;
  clientId?: string | null; // Allow null for org-level events (billing)
  inviteId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
};

export async function auditLog(p: AuditParams) {
  const { create } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");
  
  await create("audit_logs", {
    id: randomUUID(),
    userId: p.actorId ?? null,
    clientId: p.clientId ?? null, // Allow null for org-level events
    action: p.action,
    message: `${p.action}: ${JSON.stringify(p.metadata ?? {})}`,
    createdAt: new Date().toISOString(),
    // Note: You may need to add inviteId to your audit_logs table if it doesn't exist
  });
}

export async function logAuditEvent(params: {
  userId?: string | null;
  clientId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  return auditLog({
    actorType: "ATTORNEY",
    actorId: params.userId ?? null,
    clientId: params.clientId ?? null,
    action: params.action,
    metadata: params.metadata,
  });
}
