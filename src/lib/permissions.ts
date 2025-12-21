import { requireAttorney, type User } from "@/lib/auth";
import { getRegistryById } from "@/lib/db";
import { redirect } from "next/navigation";

/**
 * Permissions Library
 * 
 * Handles permission checks and access control logic.
 * 
 * Cursor hint: Generate the permission guard once, then reuse everywhere.
 */

/**
 * Permission Guard Result
 * Contains the authenticated user and any additional context
 */
export type PermissionGuardResult = {
  user: User;
};

/**
 * Verify attorney can access a registry
 * 
 * For now, all attorneys have global access to all registries.
 * This can be extended later with organization-based or explicit access controls.
 * 
 * @param registryId - The registry ID to check access for
 * @returns Permission guard result with authenticated user
 * @throws Redirects to error page if access denied
 */
export async function verifyRegistryAccess(registryId: string): Promise<PermissionGuardResult> {
  // Require attorney authentication
  const user = await requireAttorney();

  // Verify registry exists
  try {
    await getRegistryById(registryId);
  } catch (error) {
    console.error("Error verifying registry access:", error);
    redirect("/error?type=not_found");
  }

  // For now, all attorneys have global access
  // TODO: Add organization-based or explicit access controls if needed
  // Example:
  // const hasAccess = await checkOrganizationAccess(user.id, registryId);
  // if (!hasAccess) {
  //   redirect("/error?type=forbidden");
  // }

  return { user };
}

/**
 * Get all registries accessible by an attorney
 * 
 * For now, returns all registries (global access).
 * Can be filtered by organization or explicit access grants later.
 * 
 * @param userId - The attorney user ID
 * @returns Array of registry IDs accessible by the attorney
 */
export async function getAuthorizedRegistryIds(userId: string): Promise<string[]> {
  // For now, all attorneys have global access to all registries
  // TODO: Filter by organization membership or explicit access grants
  
  // This would query the database for all registries
  // For now, we'll return an empty array and let the calling code fetch all
  // In a real implementation, you might do:
  // const registries = await db.select({ id: registryRecords.id })
  //   .from(registryRecords)
  //   .where(/* access conditions */);
  // return registries.map(r => r.id);
  
  return []; // Empty means "all" for now (handled in calling code)
}

/**
 * Check if attorney has access to a specific registry
 * 
 * @param userId - The attorney user ID
 * @param registryId - The registry ID to check
 * @returns True if attorney has access, false otherwise
 */
export async function hasRegistryAccess(userId: string, registryId: string): Promise<boolean> {
  try {
    // Verify registry exists
    await getRegistryById(registryId);
    
    // For now, all attorneys have global access
    return true;
    
    // TODO: Add organization-based or explicit access checks
    // Example:
    // const user = await getUserById(userId);
    // const registry = await getRegistryById(registryId);
    // return await checkOrganizationMatch(user, registry);
  } catch {
    return false;
  }
}
