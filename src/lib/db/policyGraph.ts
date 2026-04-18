/** Read policy → client FK from a PostgREST row (snake or camel). */
export function readClientId(policy: Record<string, unknown>): string | null {
  const v = policy.client_id ?? policy.clientId;
  return typeof v === "string" ? v : null;
}

/** Read client → org FK from a PostgREST row (snake or camel). */
export function readOrgId(client: Record<string, unknown>): string | null {
  const v = client.org_id ?? client.orgId;
  return typeof v === "string" ? v : null;
}
