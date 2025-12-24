export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
