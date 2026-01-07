/**
 * Document Upload Guard
 * 
 * Server-side guard for document uploads with tier-based category enforcement.
 */

// Prisma removed - database access needs to be implemented
// import { prisma, writeAuditLog } from "@/lib/db";
import { getEffectiveTier } from "@/lib/contracts/features";
import { checkDocumentUploadPermission } from "./permissions";
import { getDocumentCategory } from "./taxonomy";
import type { DocumentCategory } from "@/lib/db";

/**
 * Check if user can upload a document with given fileType
 * Returns error object if denied, null if allowed
 * 
 * @param organizationId - Organization ID (can be null for public uploads)
 * @param clientId - Client ID (used to get org if organizationId not provided)
 * @param fileType - Document file type
 * @param fileName - Document file name
 * @param endpoint - API endpoint where upload was attempted
 * @param userId - Optional user ID for audit logging
 */
export async function checkUploadPermission(
  fileType: string | null,
  fileName: string,
  endpoint: string,
  organizationId?: string | null,
  clientId?: string | null,
  userId?: string | null
): Promise<{ code: string; requiredTier: string; reason: string } | null> {
  // Get organization ID if not provided
  let orgId = organizationId;
  
  if (!orgId && clientId) {
    const { findUnique } = await import("@/lib/db");
    type ClientRecord = {
      orgId?: string | null;
      organizationId?: string | null;
    };
    const client = await findUnique<ClientRecord>("clients", { id: clientId });
    orgId = client?.orgId || client?.organizationId || null;
  }

  // If no organization, allow upload (public uploads without org context)
  // This maintains backward compatibility
  if (!orgId) {
    return null;
  }

  // Get effective tier for organization
  const tier = await getEffectiveTier(orgId);

  // Map fileType to category
  const category = getDocumentCategory(fileType, null);

  // Check permission
  const permissionError = checkDocumentUploadPermission(tier, category);

  if (permissionError) {
    // Log restricted attempt
    await logRestrictedUploadAttempt({
      organizationId: orgId,
      userId: userId || null,
      category: category || null,
      fileName,
      endpoint,
    });

    return permissionError;
  }

  return null;
}

/**
 * Log restricted upload attempt to audit log
 */
async function logRestrictedUploadAttempt(input: {
  organizationId: string;
  userId: string | null;
  category: DocumentCategory | null;
  fileName: string;
  endpoint: string;
}): Promise<void> {
  try {
    // Use audit logging
    const { auditLog } = await import("@/lib/audit");
    await auditLog({
      actorType: "ATTORNEY",
      actorId: input.userId,
      clientId: null,
      inviteId: null,
      action: "DOCUMENT_UPLOAD_BLOCKED",
      metadata: {
        organizationId: input.organizationId,
        category: input.category || "UNCATEGORIZED",
        fileName: input.fileName,
        endpoint: input.endpoint,
      },
    });

    // Log structured data for easier querying
    console.log("[RESTRICTED_UPLOAD]", {
      organizationId: input.organizationId,
      userId: input.userId,
      category: input.category,
      fileName: input.fileName,
      endpoint: input.endpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail upload check if audit logging fails
    console.error("Failed to log restricted upload attempt:", error);
  }
}

/**
 * Require upload permission - throws if denied
 */
export async function requireUploadPermission(
  fileType: string | null,
  fileName: string,
  endpoint: string,
  organizationId?: string | null,
  clientId?: string | null,
  userId?: string | null
): Promise<void> {
  const error = await checkUploadPermission(fileType, fileName, endpoint, organizationId, clientId, userId);
  
  if (error) {
    const { HttpError } = await import("@/lib/permissions/guard");
    throw new HttpError(
      403,
      `Document upload blocked: ${error.reason}. Required tier: ${error.requiredTier}`
    );
  }
}
