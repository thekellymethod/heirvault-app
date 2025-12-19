import { prisma } from "./db";
import { AuditAction } from "@prisma/client";
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

  // Use raw SQL first to avoid Prisma client issues
  try {
    const auditId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO audit_logs (id, user_id, org_id, client_id, policy_id, action, message, created_at)
      VALUES (${auditId}, ${userId}, ${orgId}, ${clientId}, ${policyId}, ${action}::text::"AuditAction", ${opts.message}, NOW())
    `;
  } catch (sqlError: any) {
    console.error("audit: Raw SQL failed, trying Prisma:", sqlError.message);
    // Fallback to Prisma
    try {
      if ((prisma as any).audit_logs) {
        await (prisma as any).audit_logs.create({
          data: {
            action: action,
            message: opts.message,
            user_id: userId,
            org_id: orgId,
            client_id: clientId,
            policy_id: policyId,
          },
        });
      } else if ((prisma as any).auditLog) {
        await (prisma as any).auditLog.create({
          data: {
            action: action,
            message: opts.message,
            userId: userId,
            orgId: orgId,
            clientId: clientId,
            policyId: policyId,
          },
        });
      }
    } catch (prismaError: any) {
      console.error("audit: Prisma also failed:", prismaError.message);
      // Continue without logging - audit is non-critical
    }
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

  // Use raw SQL first to avoid Prisma client issues
  try {
    const auditId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO audit_logs (id, user_id, org_id, client_id, policy_id, action, message, created_at)
      VALUES (${auditId}, ${userId}, ${orgId}, ${clientId}, ${policyId}, ${action}::text::"AuditAction", ${message}, NOW())
    `;
  } catch (sqlError: any) {
    console.error("logAuditEvent: Raw SQL failed, trying Prisma:", sqlError.message);
    // Fallback to Prisma
    try {
      // Try both possible model names
      if ((prisma as any).audit_logs) {
        await (prisma as any).audit_logs.create({
          data: {
            action: action,
            message: message,
            user_id: userId,
            org_id: orgId,
            client_id: clientId,
            policy_id: policyId,
          },
        });
      } else if ((prisma as any).auditLog) {
        await (prisma as any).auditLog.create({
          data: {
            action: action,
            message: message,
            userId: userId,
            orgId: orgId,
            clientId: clientId,
            policyId: policyId,
          },
        });
      } else {
        console.error("logAuditEvent: Neither audit_logs nor auditLog model found");
        // Continue without logging - audit is non-critical
      }
    } catch (prismaError: any) {
      console.error("logAuditEvent: Prisma also failed:", prismaError.message);
      // Continue without logging - audit is non-critical
    }
  }
}