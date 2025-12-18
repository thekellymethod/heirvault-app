import { prisma } from "./db";
import { AuditAction } from "@prisma/client";
import { getCurrentUserWithOrg } from "./authz";

interface AuditOptions {
  clientId?: string;
  policyId?: string;
  message: string;
}

export async function audit(action: AuditAction, opts: AuditOptions) {
  const { user, orgMember } = await getCurrentUserWithOrg();

  await prisma.auditLog.create({
    data: {
      action,
      message: opts.message,
      userId: user?.id ?? null,
      orgId: orgMember?.organizationId ?? null,
      clientId: opts.clientId ?? null,
      policyId: opts.policyId ?? null,
    },
  });
}

// Alias for backward compatibility
export async function logAuditEvent(opts: {
  action: AuditAction | string;
  message: string;
  userId?: string;
  clientId?: string;
  policyId?: string;
}) {
  const { user, orgMember } = await getCurrentUserWithOrg();

  await prisma.auditLog.create({
    data: {
      action: opts.action as AuditAction,
      message: opts.message,
      userId: opts.userId ?? user?.id ?? null,
      orgId: orgMember?.organizationId ?? null,
      clientId: opts.clientId ?? null,
      policyId: opts.policyId ?? null,
    },
  });
}