import "server-only";
import { getOrCreateAppUser } from "@/lib/auth/CurrentUser";

/**
 * Check if the current user is an admin
 * Uses the roles array from the Prisma User model
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const user = await getOrCreateAppUser();
    return user?.roles.includes("ADMIN") ?? false;
  } catch {
    return false;
  }
}

/**
 * Check if a user object has admin role
 */
export function hasAdminRole(user: { roles?: string[] } | null | undefined): boolean {
  return user?.roles?.includes("ADMIN") ?? false;
}

/**
 * Admin bypass wrapper - returns true if user is admin, otherwise calls the check function
 * Use this to wrap any authorization check
 */
export async function withAdminBypass<T>(
  checkFn: () => Promise<T> | T
): Promise<T> {
  const user = await getOrCreateAppUser();
  if (hasAdminRole(user)) {
    // Admin bypass - return a truthy value or allow the operation
    return {} as T;
  }
  return await checkFn();
}

