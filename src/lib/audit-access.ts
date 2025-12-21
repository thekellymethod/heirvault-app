import { type User } from "@/lib/auth";
import { logAccess, type AccessLogAction } from "@/lib/db";

/**
 * Audit & Receipts Library
 * 
 * Legal Backbone - Every route handler must call logAccess().
 * This is where credibility lives.
 */

/**
 * Log access with user context and metadata
 * 
 * Every route handler must call this function.
 * 
 * @param user - The authenticated user (from requireAttorney() or requireAdmin())
 * @param registryId - The registry ID being accessed
 * @param action - The action being performed
 * @param metadata - Optional metadata for audit trail
 */
export async function logAccessWithUser(
  user: User,
  registryId: string,
  action: AccessLogAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAccess({
    registryId,
    userId: user.id,
    action,
    metadata: metadata || undefined,
  });
}

/**
 * Log system action (no user)
 * 
 * For system-initiated actions (e.g., intake submissions, automated processes)
 */
export async function logSystemAccess(
  registryId: string,
  action: AccessLogAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAccess({
    registryId,
    userId: null,
    action,
    metadata: metadata || undefined,
  });
}

