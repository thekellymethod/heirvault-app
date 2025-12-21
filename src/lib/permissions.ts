import { type User, ForbiddenError } from "@/lib/auth";
import { Role } from "@/lib/roles";
import { listAuthorizedRegistries, getRegistryById } from "@/lib/db";

/**
 * Permissions Library
 * 
 * Implements permission checks with role-based access control.
 * Role logic: ADMIN can do all; ATTORNEY limited to authorized registries; SYSTEM internal.
 * 
 * Do not query DB directly - use functions from /lib/db.ts.
 */

/**
 * Check if user can access a registry
 * 
 * Role logic:
 * - ADMIN: Can access all registries
 * - ATTORNEY: Can only access authorized registries (via listAuthorizedRegistries)
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
  // ADMIN can access all registries
  if (user.role === "ADMIN") {
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
    const authorizedRegistries = await listAuthorizedRegistries(user.id);
    return authorizedRegistries.some((registry) => registry.id === registryId);
  }

  // Unknown role - deny access
  return false;
}

/**
 * Require access to a registry
 * 
 * Throws ForbiddenError (403) if user cannot access the registry.
 * 
 * @param user - The user to check
 * @param registryId - The registry ID to check access for
 * @throws ForbiddenError if access denied
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
    throw new ForbiddenError(`Access denied to registry ${registryId}`);
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
export function canViewAudit({ user }: { user: User }): boolean {
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

  // Unknown role - deny audit access
  return false;
}
