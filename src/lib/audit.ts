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
