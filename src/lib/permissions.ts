import { type AppUser } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { isAdmin } from "@/lib/admin";
import { getRegistryById, listAuthorizedRegistries } from "@/lib/db";

type User = AppUser;

/**
 * Permissions Library
 * 
 * Implements permission checks with role-based access control.
 * 
 * Security Model:
 * - ADMIN: Determined by ADMIN_EMAILS env var (server-authoritative)
 * - ATTORNEY: Limited to registries in registry_permissions table
 * - SYSTEM: Internal use only (full access)
 * 
 * IMPORTANT: All database access must use service role (server-side only).
 * Do not query DB directly - use functions from /lib/db.ts.
 * 
 * Error Handling:
 * - Returns 403 (Forbidden) for unauthorized access (not 404)
 * - This confirms the registry exists but user lacks permission
 * - Use 404 only if registry doesn't exist
 */

/**
 * Check if user can access a registry
 * 
 * Role logic:
 * - ADMIN: Can access all registries (checked via ADMIN_EMAILS)
 * - ATTORNEY: Can only access authorized registries (via registry_permissions table)
 * - SYSTEM: Internal use only (can access all)
 * 
 * @param user - The user to check
 * @param registryId - The registry ID to check access for
 * @returns True if user can access the registry
 */
export async function canAccessRegistry({
  user,
  registryId,
}: {
  user: User;
  registryId: string;
}): Promise<boolean> {
  // ADMIN can access all registries - check roles array
  const { hasAdminRole } = await import("@/lib/auth/admin-bypass");
  if (hasAdminRole(user as { roles?: string[] })) {
    // Verify registry exists
    const registry = await getRegistryById(registryId);
    return registry !== null;
  }
  
  // Also check legacy admin system for backwards compatibility
  const userIsAdmin = await isAdmin(user);
  if (userIsAdmin) {
    // Verify registry exists
    const registry = await getRegistryById(registryId);
    return registry !== null;
  }

  // SYSTEM can access all registries (internal use)
  if (user.role === "SYSTEM") {
    const registry = await getRegistryById(registryId);
    return registry !== null;
  }

  // ATTORNEY: Check if registry is in authorized list
  if (user.role === "ATTORNEY") {
    const authorizedRegistries = await listAuthorizedRegistries(user.clerkId);
    return authorizedRegistries.some((registry) => registry.id === registryId);
  }

  // Unknown role - deny access (fail secure)
  return false;
}

/**
 * Require access to a registry
 * 
 * Security Decision: Returns 403 (Forbidden), not 404
 * - 403 = Registry exists but user lacks permission
 * - 404 = Registry does not exist
 * 
 * This prevents information leakage while being explicit about authorization failures.
 * 
 * @param user - The user to check
 * @param registryId - The registry ID to check access for
 * @throws HttpError(403) if access denied
 * @throws HttpError(404) if registry does not exist (only after permission check passes)
 */
export async function requireAccessRegistry({
  user,
  registryId,
}: {
  user: User;
  registryId: string;
}): Promise<void> {
  const hasAccess = await canAccessRegistry({ user, registryId });
  
  if (!hasAccess) {
    // Security: Return 403 (Forbidden) to indicate authorization failure
    // This is consistent across all unauthorized access attempts
    throw new HttpError(403, "FORBIDDEN", `Access denied to registry ${registryId}`);
  }
}

/**
 * Check if user can perform searches
 * 
 * Role logic:
 * - ADMIN: Can search
 * - ATTORNEY: Can search (limited to authorized registries via constrainedSearch)
 * - SYSTEM: Internal use only (can search)
 * 
 * @param user - The user to check
 * @returns True if user can search
 */
export function canSearch({ user }: { user: User }): boolean {
  // ADMIN can search
  if (user.role === "ADMIN") {
    return true;
  }

  // SYSTEM can search (internal use)
  if (user.role === "SYSTEM") {
    return true;
  }

  // ATTORNEY can search (results limited to authorized registries)
  if (user.role === "ATTORNEY") {
    return true;
  }

  // Unknown role - deny search
  return false;
}

/**
 * Check if user can view audit logs
 * 
 * Role logic:
 * - ADMIN: Can view audit logs
 * - ATTORNEY: Can view audit logs (limited to authorized registries)
 * - SYSTEM: Internal use only (can view audit logs)
 * 
 * @param user - The user to check
 * @returns True if user can view audit logs
 */
export function canViewAudit({ user }: { user: User | { roles?: string[]; role?: string } }): boolean {
  // Check if user has roles array (new auth system)
  if ('roles' in user && Array.isArray(user.roles)) {
    if (user.roles.includes("ADMIN")) {
      return true;
    }
    if (user.roles.includes("ATTORNEY")) {
      return true;
    }
    return false;
  }

  // Legacy: Check role string (old auth system)
  if ('role' in user) {
    // ADMIN can view audit logs
    if (user.role === "ADMIN") {
      return true;
    }

    // SYSTEM can view audit logs (internal use)
    if (user.role === "SYSTEM") {
      return true;
    }

    // ATTORNEY can view audit logs (filtered to authorized registries)
    if (user.role === "ATTORNEY") {
      return true;
    }
  }

  // Unknown role - deny audit access
  return false;
}
