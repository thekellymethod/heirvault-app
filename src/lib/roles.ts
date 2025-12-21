/**
 * Roles Library
 * 
 * Defines role enum and role-related utilities.
 */

/**
 * Role enum
 */
export enum Role {
  ADMIN = "ADMIN",
  ATTORNEY = "ATTORNEY",
  SYSTEM = "SYSTEM",
}

/**
 * Type for role values (string union)
 */
export type Role = "ADMIN" | "ATTORNEY" | "SYSTEM";

/**
 * Check if a value is a valid role
 */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (value === "ADMIN" || value === "ATTORNEY" || value === "SYSTEM");
}
