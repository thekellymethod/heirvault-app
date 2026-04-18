/**
 * org_members rows from PostgREST use snake_case columns (organization_id).
 * Some routes incorrectly read organizationId (camelCase), which is undefined.
 */
export function organizationIdFromMemberRow(
  row: Record<string, unknown>
): string | undefined {
  const v = row.organization_id ?? row.organizationId;
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
