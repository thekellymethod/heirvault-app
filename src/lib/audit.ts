import { db, auditLogs, AuditAction } from "./db";
import { getCurrentUserWithOrg } from "./authz";
import { randomUUID } from "crypto";

interface AuditOptions {
  clientId?: string;
  policyId?: string;
  message: string;
}

export async function audit(action: AuditAction, opts: AuditOptions) {
  const { user, orgMember } = await getCurrentUserWithOrg();

  const userId = user?.id ?? null;
  const orgId = (orgMember as any)?.organizationId ?? orgMember?.organizations?.id ?? null;
  const clientId = opts.clientId ?? null;
  const policyId = opts.policyId ?? null;

  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      userId: userId || undefined,
      orgId: orgId || undefined,
      clientId: clientId || undefined,
      policyId: policyId || undefined,
      action: action as any,
      message: opts.message,
    });
  } catch (error: any) {
    console.error("audit: Failed to log audit event:", error.message);
    // Continue without logging - audit is non-critical
  }
}

// Alias for backward compatibility
export async function logAuditEvent(opts: {
  action: AuditAction | string;
  message: string;
  userId?: string;
  clientId?: string;
  policyId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
}) {
  const { user, orgMember } = await getCurrentUserWithOrg();

  const userId = opts.userId ?? user?.id ?? null;
  const orgId = (orgMember as any)?.organizationId ?? orgMember?.organizations?.id ?? null;
  const clientId = opts.clientId ?? null;
  const policyId = opts.policyId ?? null;
  const action = opts.action as AuditAction;
  const message = opts.message;

  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      userId: userId || undefined,
      orgId: orgId || undefined,
      clientId: clientId || undefined,
      policyId: policyId || undefined,
      action: action as any,
      message: message,
    });
  } catch (error: any) {
    console.error("logAuditEvent: Failed to log audit event:", error.message);
    // Continue without logging - audit is non-critical
  }
}