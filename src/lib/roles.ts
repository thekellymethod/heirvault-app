/**
 * Role Definitions and Permissions
 * 
 * This file defines the role hierarchy and what each role can do.
 * 
 * Role Hierarchy (most to least permissions):
 * - OWNER: Full access (read, write, delete, manage permissions)
 * - ADMIN: Full access (read, write, delete, manage permissions) - determined by ADMIN_EMAILS
 * - ATTORNEY: Read + export (can view and export, cannot modify)
 * - EDITOR: Read + write (can view and modify, cannot delete or manage permissions)
 * - VIEWER: Read only (can view, cannot modify or export)
 * - SYSTEM: Internal use only (full access for system operations)
 */

export type Role = "ADMIN" | "ATTORNEY" | "SYSTEM" | "OWNER" | "EDITOR" | "VIEWER";

export const Roles = {
  ADMIN: "ADMIN",
  ATTORNEY: "ATTORNEY",
  SYSTEM: "SYSTEM",
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

export function isRole(value: unknown): value is Role {
  return (
    value === "ADMIN" ||
    value === "ATTORNEY" ||
    value === "SYSTEM" ||
    value === "OWNER" ||
    value === "EDITOR" ||
    value === "VIEWER"
  );
}

/**
 * Get role hierarchy level (higher = more permissions)
 */
export function getRoleHierarchy(role: Role): number {
  switch (role) {
    case "OWNER":
    case "ADMIN":
    case "SYSTEM":
      return 5;
    case "ATTORNEY":
      return 3;
    case "EDITOR":
      return 2;
    case "VIEWER":
      return 1;
    default:
      return 0;
  }
}

/**
 * Check if a role meets the minimum required role
 */
export function roleMeetsRequirement(userRole: Role, requiredRole: Role): boolean {
  return getRoleHierarchy(userRole) >= getRoleHierarchy(requiredRole);
}

/**
 * Permission capabilities by role
 */
export type PermissionCapability = 
  | "READ"
  | "WRITE"
  | "DELETE"
  | "EXPORT"
  | "MANAGE_PERMISSIONS";

const ROLE_CAPABILITIES: Record<Role, PermissionCapability[]> = {
  OWNER: ["READ", "WRITE", "DELETE", "EXPORT", "MANAGE_PERMISSIONS"],
  ADMIN: ["READ", "WRITE", "DELETE", "EXPORT", "MANAGE_PERMISSIONS"],
  ATTORNEY: ["READ", "EXPORT"],
  EDITOR: ["READ", "WRITE"],
  VIEWER: ["READ"],
  SYSTEM: ["READ", "WRITE", "DELETE", "EXPORT", "MANAGE_PERMISSIONS"],
};

/**
 * Check if a role has a specific capability
 */
export function roleHasCapability(role: Role, capability: PermissionCapability): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}
