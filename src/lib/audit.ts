// src/lib/audit.ts
import { prisma, AuditAction } from "@/lib/db";
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
  // Map to your existing audit_logs table structure
  // Adjust field names based on your actual schema
  await prisma.audit_logs.create({
    data: {
      id: crypto.randomUUID(),
      userId: p.actorId ?? null,
      clientId: p.clientId ?? null, // Allow null for org-level events
      action: p.action as AuditAction,
      message: `${p.action}: ${JSON.stringify(p.metadata ?? {})}`,
      // Note: You may need to add inviteId to your audit_logs table if it doesn't exist
    },
  });
}
