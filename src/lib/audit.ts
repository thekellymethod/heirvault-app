import { logAccess as dbLogAccess } from "@/lib/db";

export type Action =
  | "INTAKE_SUBMITTED"
  | "REGISTRY_UPDATED_BY_TOKEN"
  | "DASHBOARD_VIEW"
  | "REGISTRY_VIEW"
  | "SEARCH_PERFORMED"
  | "DOCUMENT_UPLOADED";

function maskSensitive(metadata: Record<string, any> | undefined) {
  if (!metadata) return undefined;
  const clone = structuredClone(metadata);

  // Mask fields that commonly carry sensitive identifiers
  const mask = (v: unknown) => (typeof v === "string" && v.length > 6 ? `${v.slice(0, 2)}••••${v.slice(-2)}` : v);

  for (const key of Object.keys(clone)) {
    if (/(policy|ssn|account|number)/i.test(key)) clone[key] = mask(clone[key]);
  }
  return clone;
}

export async function logAccess(input: {
  userId: string | null;
  registryId?: string | null;
  action: Action;
  metadata?: Record<string, any>;
}) {
  await dbLogAccess({
    user_id: input.userId,
    registry_id: input.registryId ?? null,
    action: input.action,
    metadata: maskSensitive(input.metadata),
  });
}
