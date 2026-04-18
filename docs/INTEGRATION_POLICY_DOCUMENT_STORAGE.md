# Policy document storage (HeirVault)

Private Supabase Storage for policy-centric files: bucket **`heirvault-docs`**, metadata table **`policy_documents`**, firm-scoped RLS.

## Files

| Piece | Location |
|--------|----------|
| Migration (bucket + table + RLS) | `supabase/migrations/20260417120000_heirvault_docs_storage_policy_documents.sql` |
| Server helpers | `src/lib/storage/policyDocuments.ts` |
| Org + policy chain checks (Clerk / DB) | `src/lib/storage/policyDocumentAccess.ts` |
| HTTP API (auth + checks + helpers) | `src/app/api/policy-documents/upload/route.ts`, `signed-url/route.ts`, `[documentId]/route.ts` |
| Upload MIME/size rules | `src/lib/storage/policyDocumentUploadRules.ts` (PDF / JPEG / PNG, 50 MiB cap, non-empty) |
| Reconciliation helper script | `scripts/reconcile-policy-documents-storage.ts` |
| Access unit tests | `src/lib/storage/__tests__/policyDocumentAccess.test.ts`, `policyDocumentUploadRules.test.ts` |

Apply the migration with your usual flow (e.g. `supabase db push` using `SUPABASE_DB_POOLER_URL`).

## Path layout (required)

Object key (and `policy_documents.file_path`):

```text
{firmId}/{estateId}/{policyId}/{type}/{filename}
```

- `firmId`, `estateId`, `policyId`: UUID strings (normalized to lowercase in helpers).
- `type`: slug, e.g. `policy-document`, `beneficiary-form`, `generated`.
- `filename`: single segment (no `/`, `\`, or `..`).

Example:

```text
550e8400-e29b-41d4-a716-446655440000/660e8400-e29b-41d4-a716-446655440001/770e8400-e29b-41d4-a716-446655440002/policy-document/policy.pdf
```

## Built-in API routes

These routes use **`withRouteGuard`**, **`requireAuthPrincipal`**, and **`assertPolicyDocumentPathAccess`** / **`loadPolicyDocumentForAccess`** so **org membership** (via `requireOrgMember(firmId)`) and **policy → client (`estateId`) → org (`firmId`)** are enforced before the service-role helpers run.

| Method | Path | Purpose |
|--------|------|--------|
| `POST` | `/api/policy-documents/upload` | Multipart: `firmId`, `estateId`, `policyId`, `type` (optional), `file` |
| `POST` | `/api/policy-documents/signed-url` | JSON: `{ documentId, firmId, expiresInSeconds? }` — response includes `issuedAt`, `expiresAt`, `expiresInSeconds` |
| `DELETE` | `/api/policy-documents/[documentId]?firmId={uuid}` | Remove object + DB row |

**`estateId`** is the **`clients.id`** that owns the policy (`policies.client_id`). Product copy may say “estate”; the database row is still **`clients`**. **`firmId`** is **`organizations.id`** and must match **`clients.org_id`**.

**Canonical IDs:** uploads call `resolveCanonicalPolicyDocumentUploadIds` after graph checks so the storage path is built from UUIDs **re-read** from `policies` / `clients`, not from raw multipart strings (still validated against the same graph).

**Upload validation:** allowed MIME types are **application/pdf**, **image/jpeg**, **image/png**; max size **52,428,800** bytes (aligned with the bucket limit); empty bodies rejected; filenames sanitized in `policyDocuments.ts`.

**Audit trail:** successful upload, signed URL issuance, and delete append `audit_logs` with actions `POLICY_DOCUMENT_UPLOAD`, `POLICY_DOCUMENT_SIGNED_URL_ISSUED`, `POLICY_DOCUMENT_DELETE`. If storage is removed but the DB delete fails, `POLICY_DOCUMENT_DB_DELETE_FAILED_AFTER_STORAGE` is written and a structured line is logged to stderr for reconciliation.

**Reconciliation:** `npx tsx scripts/reconcile-policy-documents-storage.ts [--limit=500]` checks each `policy_documents` row for a downloadable object (full object fetch — use `--limit` in production). Extend with SQL on `storage.objects` if you need orphan object detection.

Platform **admins** (`isAdmin()`) skip `requireOrgMember` but still go through the policy/client/org chain so paths cannot be forged across tenants.

## Calling from another Route Handler or Server Action

Helpers remain **`server-only`** and use **`SUPABASE_SERVICE_ROLE_KEY`**. Either **call the routes above from the client** (session cookies / Clerk) or **import** `uploadPolicyDocument` / `getPolicyDocumentSignedUrl` / `deletePolicyDocument` only after the same checks as in `policyDocumentAccess.ts`. Service role bypasses Postgres and Storage RLS.

## Assumptions: user → firm for RLS

Postgres and Storage policies use **`auth.uid()`** and `org_members.user_id = auth.uid()` to resolve firms:

- **`public.users.id` must match Supabase `auth.uid()`** for users who appear in `org_members`.
- If you only use **Clerk** today and JWTs are not Supabase Auth, **end users do not get `auth.uid()`** on the database. In that case:
  - Keep using **service role** on the server for uploads/downloads (current helpers), and
  - Optionally link Clerk users to Supabase Auth and sync `public.users.id`, **or**
  - Replace `heirvault_auth_user_firm_ids()` with a `SECURITY DEFINER` function that reads a JWT claim (e.g. `auth.jwt()->>'firm_id'`) once you standardize claims.

RLS remains useful for **Supabase-authenticated** clients and as defense-in-depth when policies are satisfied.

## Signed URL default

`DEFAULT_SIGNED_URL_EXPIRY_SECONDS` is **600** (10 minutes). Override per call with `expiresInSeconds` (clamped between 60 and 7 days in helpers).

## Bucket visibility

Bucket is created with **`public = false`**. Use **signed URLs** (or server proxy) for reads; do not rely on public buckets.
