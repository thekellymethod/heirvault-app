import "server-only";

/**
 * Policy document access (HeirVault)
 *
 * **Authority is always the database graph**, never client-supplied UUID strings alone.
 * `firmId`, `estateId`, and `policyId` from the request are treated as *candidate* keys: we
 * load `policies` → `clients` and verify `clients.org_id` and `policies.client_id`.
 * Upload paths use {@link resolveCanonicalPolicyDocumentUploadIds} so object keys are built
 * only from values re-read from those rows (normalized), not from unvalidated client text.
 *
 * **Naming:** product language may say “estate”, but the FK today is `public.clients.id`.
 * The API field `estateId` means **client (estate) id** — document aggressively to avoid
 * wiring the wrong entity into access checks later.
 *
 * **Admin bypass:** {@link isAdmin} is **platform** admin (Clerk metadata / env allowlist),
 * not “organization admin” or a generic staff role. Org-scoped admins still use
 * `requireOrgMember` like everyone else.
 */

import { requireOrgMemberHttp } from "@/lib/authz";
import { isAdmin } from "@/lib/admin";
import { readClientId, readOrgId } from "@/lib/db/policyGraph";
import { findUnique } from "@/lib/db";
import { HttpError } from "@/lib/permissions/guard";
import { normalizeUuid } from "@/lib/validation/uuids";

export async function requireFirmMembershipOrAdmin(firmId: string): Promise<void> {
  if (await isAdmin()) return;
  await requireOrgMemberHttp(firmId);
}

/**
 * Policy exists, estate (client) matches policy, client org matches firm — no membership check.
 * Exported for focused unit tests; routes should prefer {@link assertPolicyDocumentPathAccess}
 * or {@link resolveCanonicalPolicyDocumentUploadIds}.
 */
export async function assertPolicyBelongsToFirmAndEstate(params: {
  firmId: string;
  estateId: string;
  policyId: string;
}): Promise<CanonicalPolicyDocumentIds> {
  const firmId = normalizeUuid(params.firmId);
  const estateId = normalizeUuid(params.estateId);
  const policyId = normalizeUuid(params.policyId);

  const policy = await findUnique<Record<string, unknown>>("policies", { id: policyId });
  if (!policy) throw new HttpError(404, "Policy not found");

  const clientId = readClientId(policy);
  if (!clientId) throw new HttpError(500, "Policy record missing client");

  if (normalizeUuid(clientId) !== estateId) {
    throw new HttpError(400, "estateId does not match this policy");
  }

  const client = await findUnique<Record<string, unknown>>("clients", { id: clientId });
  if (!client) throw new HttpError(404, "Client not found");

  const orgId = readOrgId(client);
  if (!orgId || normalizeUuid(orgId) !== firmId) {
    throw new HttpError(403, "Firm does not own this policy");
  }

  return {
    firmId: normalizeUuid(orgId),
    estateId: normalizeUuid(clientId),
    policyId,
  };
}

/**
 * Ensures the caller may act on this policy path: org membership (or platform admin),
 * policy exists, estate (client) id matches the policy, and the client belongs to the firm.
 */
export async function assertPolicyDocumentPathAccess(params: {
  firmId: string;
  estateId: string;
  policyId: string;
}): Promise<void> {
  const firmId = normalizeUuid(params.firmId);
  await requireFirmMembershipOrAdmin(firmId);
  await assertPolicyBelongsToFirmAndEstate(params);
}

export type CanonicalPolicyDocumentIds = {
  /** `organizations.id` from `clients.org_id` */
  firmId: string;
  /** `clients.id` (product term: estate) */
  estateId: string;
  policyId: string;
};

/**
 * After membership + graph checks, return UUIDs from the DB for storage paths and
 * `policy_documents` inserts. Call this before `uploadPolicyDocument`.
 */
export async function resolveCanonicalPolicyDocumentUploadIds(params: {
  firmId: string;
  estateId: string;
  policyId: string;
}): Promise<CanonicalPolicyDocumentIds> {
  const firmId = normalizeUuid(params.firmId);
  await requireFirmMembershipOrAdmin(firmId);
  return assertPolicyBelongsToFirmAndEstate(params);
}

export type PolicyDocumentAccessRow = {
  id: string;
  firm_id: string;
  estate_id: string;
  policy_id: string;
  file_path: string;
};

/** Load metadata row and ensure firmId matches the row before path checks. */
export async function loadPolicyDocumentForAccess(
  documentId: string,
  firmId: string
): Promise<PolicyDocumentAccessRow> {
  const did = normalizeUuid(documentId);
  const fid = normalizeUuid(firmId);
  await requireFirmMembershipOrAdmin(fid);

  const row = await findUnique<PolicyDocumentAccessRow>("policy_documents", { id: did });
  if (!row) throw new HttpError(404, "Document not found");

  if (normalizeUuid(row.firm_id) !== fid) {
    throw new HttpError(403, "Forbidden");
  }

  await assertPolicyBelongsToFirmAndEstate({
    firmId: row.firm_id,
    estateId: row.estate_id,
    policyId: row.policy_id,
  });

  return row;
}
