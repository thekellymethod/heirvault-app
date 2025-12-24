/**
 * Type guard utilities for safe type narrowing
 */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v);
}

export function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

