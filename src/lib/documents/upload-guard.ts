/**
 * Document Upload Guard
 * 
 * Server-side guard for document uploads with tier-based category enforcement.
 */

// Prisma removed - database access needs to be implemented
// import { prisma, writeAuditLog } from "@/lib/db";
import { requireAuthPrincipal } from "@/lib/permissions/guard";
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
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { orgId: true },
    });
    orgId = client?.orgId || null;
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
    // Use a generic action that exists in the enum, or extend the enum
    // For now, we'll use DOCUMENT_UPLOADED with metadata indicating it was blocked
    await writeAuditLog({
      action: "DOCUMENT_UPLOADED", // Using existing action, blocked status in metadata
      message: `Restricted document upload attempt blocked: ${input.fileName} (category: ${input.category || "UNCATEGORIZED"}, endpoint: ${input.endpoint})`,
      userId: input.userId,
      orgId: input.organizationId,
      clientId: null,
      policyId: null,
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
      error.code,
      `Document upload blocked: ${error.reason}. Required tier: ${error.requiredTier}`
    );
  }
}
