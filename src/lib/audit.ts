import { logAccess as dbLogAccess } from "@/lib/db";

/**
 * Audit Action Types
 * 
 * All significant actions must be logged for compliance and legal defensibility.
 * 
 * Access Actions:
 * - DASHBOARD_VIEW: User viewed dashboard
 * - REGISTRY_VIEW: User viewed a specific registry
 * - SEARCH_PERFORMED: User performed a search
 * 
 * Modification Actions:
 * - INTAKE_SUBMITTED: New registry created via intake
 * - REGISTRY_UPDATED_BY_TOKEN: Registry updated via QR token
 * - REGISTRY_UPDATED_BY_ATTORNEY: Registry updated by attorney
 * 
 * Document Actions:
 * - DOCUMENT_UPLOADED: Document uploaded to registry
 * - DOCUMENT_DOWNLOADED: Document downloaded
 * 
 * Permission Actions:
 * - PERMISSION_GRANTED: User granted access to registry
 * - PERMISSION_REVOKED: User access revoked from registry
 */
export type Action =
  | "INTAKE_SUBMITTED"
  | "REGISTRY_UPDATED_BY_TOKEN"
  | "REGISTRY_UPDATED_BY_ATTORNEY"
  | "DASHBOARD_VIEW"
  | "REGISTRY_VIEW"
  | "SEARCH_PERFORMED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DOWNLOADED"
  | "PERMISSION_GRANTED"
  | "PERMISSION_REVOKED";

/**
 * Mask sensitive data in audit metadata
 * 
 * Prevents PII from being stored in audit logs.
 * Masks: policy numbers, SSNs, account numbers, etc.
 */
function maskSensitive(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const clone = structuredClone(metadata) as Record<string, unknown>;

  // Mask fields that commonly carry sensitive identifiers
  const mask = (v: unknown) => (typeof v === "string" && v.length > 6 ? `${v.slice(0, 2)}••••${v.slice(-2)}` : v);

  for (const key of Object.keys(clone)) {
    if (/(policy|ssn|account|number)/i.test(key)) clone[key] = mask(clone[key]);
  }
  return clone;
}

/**
 * Log access with comprehensive metadata
 * 
 * Security: Audit logs are append-only and protected from modification.
 * 
 * @param input.userId - User ID (null for system actions)
 * @param input.registryId - Registry ID (null for system-wide actions)
 * @param input.action - Action type
 * @param input.metadata - Additional metadata (sensitive data will be masked)
 * @param input.route - Optional route name for tracking
 * @param input.requestId - Optional request ID for correlation
 */
export async function logAccess(input: {
  userId: string | null;
  registryId?: string | null;
  action: Action;
  metadata?: Record<string, unknown>;
  route?: string;
  requestId?: string;
}) {
  // Build comprehensive metadata
  const enrichedMetadata = {
    ...maskSensitive(input.metadata),
    ...(input.route && { route: input.route }),
    ...(input.requestId && { requestId: input.requestId }),
    timestamp: new Date().toISOString(),
  };

  await dbLogAccess({
    user_id: input.userId,
    registry_id: input.registryId ?? null,
    action: input.action,
    metadata: enrichedMetadata,
  });
}

/**
 * Legacy audit function for compatibility with existing code
 * Logs to audit_logs table (not access_logs)
 */
export async function audit(
  action: string,
  metadata: {
    clientId?: string;
    policyId?: string;
    message: string;
    userId?: string | null;
    orgId?: string | null;
  }
): Promise<void> {
  const { prisma } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO audit_logs (id, user_id, org_id, client_id, policy_id, action, message, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
      randomUUID(),
      metadata.userId || null,
      metadata.orgId || null,
      metadata.clientId || null,
      metadata.policyId || null,
      action,
      metadata.message
    );
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Don't throw - audit logging is non-critical
  }
}

/**
 * Log audit event with structured parameters
 * Wrapper around audit() for convenience
 */
export async function logAuditEvent(input: {
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  userId?: string | null;
  orgId?: string | null;
}): Promise<void> {
  const message = `${input.action}: ${input.resourceType} ${input.resourceId}${input.details ? ` - ${JSON.stringify(input.details)}` : ""}`;
  
  await audit(input.action, {
    message,
    userId: input.userId || null,
    orgId: input.orgId || null,
    clientId: input.resourceType === "client" ? input.resourceId : undefined,
    policyId: input.resourceType === "policy" ? input.resourceId : undefined,
  });
}

// Export AuditAction for compatibility
export { AuditAction } from "@/lib/db/enums";
