export type Role = "ADMIN" | "ATTORNEY" | "SYSTEM";

export const Roles = {
  ADMIN: "ADMIN",
  ATTORNEY: "ATTORNEY",
  SYSTEM: "SYSTEM",
} as const;

export function isRole(value: unknown): value is Role {
  return value === "ADMIN" || value === "ATTORNEY" || value === "SYSTEM";
}
