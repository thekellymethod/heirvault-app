# Supabase Migration Progress

**Date:** January 2025  
**Status:** 🚧 **IN PROGRESS**

## Overview

Migrating from Prisma ORM to Supabase SQL for all database operations.

---

## ✅ Completed

### 1. Database Helper Functions - **COMPLETE**
- ✅ Created `src/lib/db/supabase.ts` with helper functions:
  - `getDb()` - Get Supabase admin client
  - `findUnique()` - Find single record
  - `findMany()` - Find multiple records with filtering, ordering, pagination
  - `create()` - Create new record
  - `update()` - Update existing record
  - `deleteRecord()` - Delete record
  - `count()` - Count records
  - `upsert()` - Upsert operation (find + create/update)
  - `transaction()` - Transaction wrapper (sequential execution)
  - `queryRaw()` - Raw SQL queries (requires Postgres function)

### 2. Core Library Files - **20 FILES COMPLETE**
- ✅ `src/lib/utils/clerk.ts` - User authentication (getCurrentUser, requireAuth)
- ✅ `src/lib/audit.ts` - Audit logging
- ✅ `src/lib/authz.ts` - Authorization helpers
- ✅ `src/lib/client-limits.ts` - Client limit checking
- ✅ `src/lib/inviteCompletion.ts` - Invite completion logic
- ✅ `src/lib/utils/invites.ts` - Invite management (create, accept)
- ✅ `src/lib/worker/processDocument.ts` - Document processing worker
- ✅ `src/lib/accessLog.ts` - Document access logging
- ✅ `src/lib/versioning.ts` - Document versioning
- ✅ `src/lib/permissions/orgAccess.ts` - Organization access permissions
- ✅ `src/lib/permissions/guard.ts` - Authentication and authorization guards
- ✅ `src/lib/auth/guards.ts` - Attorney verification guards
- ✅ `src/lib/org/getOrgContext.ts` - Organization context retrieval
- ✅ `src/lib/security/apiTokens.ts` - API token management (already migrated, cleaned up types)
- ✅ `src/lib/security/requireApiToken.ts` - API token authentication (already migrated, cleaned up types)
- ✅ `src/lib/billing/ledger.ts` - Billing events ledger
- ✅ `src/lib/billing/active-estates.ts` - Active estate counting
- ✅ `src/lib/billing/archive-client.ts` - Client archiving utilities
- ✅ `src/lib/billing/requireActiveSubscription.ts` - Active subscription requirement
- ✅ `src/lib/billing/requireSubscription.ts` - Organization subscription requirement
- ✅ `src/lib/documents/backfill-categories.ts` - Document category backfill utility
- ✅ `src/lib/contracts/features.ts` - Feature gate enforcement
- ✅ `src/lib/contracts/acceptance.ts` - Contract acceptance management
- ✅ `src/lib/test-invites.ts` - Test invite creation utility

### 3. API Routes - **88 FILES COMPLETE** (All active routes migrated)
- ✅ `src/app/api/clients/route.ts` - Client CRUD operations (GET, POST)
- ✅ `src/app/api/clients/[id]/route.ts` - Client detail operations (GET)
- ✅ `src/app/api/clients/[id]/invite/route.ts` - Client invite creation (POST)
- ✅ `src/app/api/policies/route.ts` - Policy CRUD operations (GET, POST)
- ✅ `src/app/api/policies/[id]/route.ts` - Policy update/delete operations (PATCH, DELETE)
- ✅ `src/app/api/policies/[id]/beneficiaries/route.ts` - Policy-beneficiary linking (POST)
- ✅ `src/app/api/policies/[id]/verify/route.ts` - Policy verification (POST)
- ✅ `src/app/api/beneficiaries/route.ts` - Beneficiary CRUD operations (GET, POST) - Already migrated
- ✅ `src/app/api/beneficiaries/[id]/route.ts` - Beneficiary update/delete operations (PUT, DELETE) - Already migrated
- ✅ `src/app/api/attorney/clients/[clientId]/dob/route.ts` - Client DOB update (POST)
- ✅ `src/app/api/attorney/clients/[clientId]/overview/route.ts` - Client overview with relations (GET)
- ✅ `src/app/api/attorney/clients/[clientId]/policies/route.ts` - Expected policy creation (POST)
- ✅ `src/app/api/attorney/clients/[clientId]/invite/send/route.ts` - Send client invite (POST)
- ✅ `src/app/api/attorney/clients/[clientId]/change-requests/create/route.ts` - Create change request (POST)
- ✅ `src/app/api/attorney/apply/route.ts` - Attorney application submission (POST)
- ✅ `src/app/api/insurers/route.ts` - Insurer list and creation (GET, POST)
- ✅ `src/app/api/insurers/[id]/route.ts` - Insurer operations (GET, PATCH, DELETE)
- ✅ `src/app/api/attorney/clients/[clientId]/change-requests/create/route.ts` - Change request creation (POST)
- ✅ `src/app/api/attorney/clients/[clientId]/invite/route.ts` - Client invite creation (POST)
- ✅ `src/app/api/attorney/clients/[clientId]/invite/send/route.ts` - Client invite send (POST)
- ✅ `src/app/api/org/me/route.ts` - Get current user's organization (GET)
- ✅ `src/app/api/org/team/invite/route.ts` - Invite team member (POST)
- ✅ `src/app/api/debug/whoami/route.ts` - Debug user authentication (GET)
- ✅ `src/app/api/debug/user-roles/route.ts` - Debug user roles (GET)
- ✅ `src/app/api/artifacts/[artifactId]/open/route.ts` - Open artifact (GET)
- ✅ `src/app/api/jobs/process-docs/route.ts` - Process documents job (POST)
- ✅ `src/app/api/organizations/route.ts` - Organization creation (POST)
- ✅ `src/app/api/organizations/[id]/route.ts` - Organization update/delete (PUT, DELETE)
- ✅ `src/app/api/policy-locator/search/route.ts` - Policy search within organization (GET)
- ✅ `src/app/api/policy-locator/global/route.ts` - Global policy search (GET)
- ✅ `src/app/api/internal/process-document/route.ts` - Internal document processing (POST)
- ✅ `src/app/api/public/intake/submit/route.ts` - Public intake submission (POST)
- ✅ `src/app/api/public/change-request/submit/route.ts` - Public change request submission (POST)
- ✅ `src/app/api/public/change-request/upload/route.ts` - Public change request upload (POST)
- ✅ `src/app/api/public/upload/route.ts` - Public document upload (POST)
- ✅ `src/app/api/policy-intake/submit/route.ts` - Policy intake receipt lookup (GET)
- ✅ `src/app/api/policy-intake/receipt/[receiptId]/route.ts` - Policy intake receipt by ID (GET)
- ✅ `src/app/api/qr/validate/route.ts` - QR token validation (POST)
- ✅ `src/app/api/qr-update/[token]/route.ts` - QR update token lookup (GET)
- ✅ `src/app/api/receipts/[receiptId]/lookup/route.ts` - Receipt lookup by ID (GET)
- ✅ `src/app/api/registry/from-session/route.ts` - Registry from Stripe session (POST)
- ✅ `src/app/api/registry/files/route.ts` - Registry files list (GET)
- ✅ `src/app/api/admin/registry/complete/route.ts` - Complete registry (POST)
- ✅ `src/app/api/admin/registry/summary-url/route.ts` - Registry summary URL (GET)
- ✅ `src/app/api/clients/[id]/policies/route.ts` - Client policies list/create (GET, POST)
- ✅ `src/app/api/clients/[id]/summary-pdf/route.ts` - Client summary PDF (GET)
- ✅ `src/app/api/invites/accept/route.ts` - Accept client invite (POST)
- ✅ `src/app/api/invite/[token]/client-data/route.ts` - Get client data for invite (GET)
- ✅ `src/app/api/invite/[token]/update-client/route.ts` - Update client via invite (POST)
- ✅ `src/app/api/invite/[token]/process-update-form/route.ts` - Process update form (POST)
- ✅ `src/app/api/invite/[token]/receipt-pdf/route.ts` - Get receipt PDF (GET)
- ✅ `src/app/api/clients/[id]/receipt/[receiptNumber]/route.ts` - Get receipt by number (GET)
- ✅ `src/app/api/clients/[id]/receipts-audit/route.ts` - Get receipts and audit trail (GET)
- ✅ `src/app/api/clients/[id]/probate-summary/route.ts` - Get probate summary PDF (GET)
- ✅ `src/app/api/billing/invoices/route.ts` - List billing invoices (GET)
- ✅ `src/app/api/billing/webhook/route.ts` - Stripe webhook handler (POST)
- ✅ `src/app/api/registries/route.ts` - List/create registries (GET, POST)
- ✅ `src/app/api/registries/create/route.ts` - Create registry (POST)
- ✅ `src/app/api/registries/[id]/route.ts` - Get/update registry (GET, PATCH)
- ✅ `src/app/api/registries/[id]/export/route.ts` - Export registry PDF (GET)
- ✅ `src/app/api/search/global/route.ts` - Global search (GET)
- ✅ `src/app/api/admin/invites/route.ts` - Admin invite search/archive (GET, POST)
- ✅ `src/app/api/admin/invites/generate/route.ts` - Generate invite (POST)
- ✅ `src/app/api/admin/clients/[clientId]/access/route.ts` - Get client access grants (GET)
- ✅ `src/app/api/admin/invites/reactivate/route.ts` - Reactivate invite (POST)
- ✅ `src/app/api/admin/clients/[clientId]/access/grant/route.ts` - Grant client access (POST)
- ✅ `src/app/api/admin/clients/[clientId]/access/revoke/route.ts` - Revoke client access (POST)
- ✅ `src/app/api/invite/[token]/upload-policy/route.ts` - Upload policy document (POST)
- ✅ `src/app/api/invite/[token]/receipt/route.ts` - Get receipt data (GET)
- ✅ `src/app/api/invite/[token]/send-confirmation/route.ts` - Send confirmation code (POST)
- ✅ `src/app/api/storage/create-upload/route.ts` - Create signed upload URL (POST)
- ✅ `src/app/api/admin/receipts/route.ts` - Admin receipt search/archive (GET, POST)
- ✅ `src/app/api/admin/users/attorneys/route.ts` - List attorneys (GET)
- ✅ `src/app/api/admin/policies/resolve-insurer/route.ts` - Resolve insurer for policy (POST)
- ✅ `src/app/api/admin/audit/search/route.ts` - Search audit logs (POST)
- ✅ `src/app/api/admin/audit/access-events/route.ts` - Get access events (POST)
- ✅ `src/app/api/admin/compliance/usage/route.ts` - Get usage statistics (GET)
- ✅ `src/app/api/admin/compliance/credentials/route.ts` - Get/update attorney credentials (GET, POST)
- ✅ `src/app/api/admin/billing-ledger/route.ts` - Get billing ledger (GET)
- ✅ `src/app/api/admin/tokens/route.ts` - List/create API tokens (GET, POST)
- ✅ `src/app/api/admin/tokens/[id]/route.ts` - Get/delete token (GET, DELETE)
- ✅ `src/app/api/admin/tokens/[id]/revoke/route.ts` - Revoke token (POST)
- ✅ `src/app/api/admin/tokens/[id]/rotate/route.ts` - Rotate token (POST)
- ✅ `src/app/api/admin/nl/execute/route.ts` - Execute NL command (POST)
- ✅ `src/app/api/admin/console/route.ts` - Admin console (GET, POST)
- ✅ `src/app/api/admin/nl/plan/route.ts` - Plan NL command (POST)
- ✅ `src/app/api/admin/manual-upload/route.ts` - Manual upload (POST)
- ✅ `src/app/api/admin/attorneys/verify/route.ts` - Verify attorney (GET, POST)
- ✅ `src/app/api/admin/attorneys/verify/document/route.ts` - Get license document (GET)
- ✅ `src/app/api/subscriptions/create-checkout/route.ts` - Create Stripe checkout session (POST)
- ✅ `src/app/api/stripe/webhook/route.ts` - Stripe webhook handler (POST)
- ✅ `src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler (POST)
- ✅ `src/app/api/contracts/accept/route.ts` - Accept contract (POST)
- ✅ `src/app/api/team/[id]/route.ts` - Update team member role (PUT)
- ✅ `src/app/api/debug/user-info/route.ts` - Get user info (GET)
- ✅ `src/app/api/debug/create-user/route.ts` - Create user (POST)
- ✅ `src/app/api/debug/grant-admin/route.ts` - Grant admin role (POST)
- ✅ `src/app/api/debug/db-check/route.ts` - Check database schema (GET)
- ✅ `src/app/api/debug/fix-db/route.ts` - Fix database schema (GET, POST)
- ✅ `src/app/api/test/populate-invites/route.ts` - Populate test invites (GET, POST)
- ✅ `src/app/api/test/foundation/route.ts` - Foundation test (GET)
- ✅ `src/app/api/test/create-invite/route.ts` - Create test invite (POST)
- ✅ `src/app/api/test/check-invite/route.ts` - Check invite (GET)
- ✅ `src/app/api/attorney/beneficiaries/proposed/[id]/confirm/route.ts` - Confirm proposed beneficiary (POST) - Placeholder (commented Prisma removed)
- ✅ `src/app/api/attorney/beneficiaries/proposed/[id]/reject/route.ts` - Reject proposed beneficiary (POST) - Placeholder (commented Prisma removed)
- ✅ `src/app/api/attorney/clients/[clientId]/beneficiaries/proposed/route.ts` - List proposed beneficiaries (GET) - Placeholder (commented Prisma removed)

### 4. Database Exports - **COMPLETE**
- ✅ Updated `src/lib/db/index.ts` to export Supabase helpers
- ✅ Exports `db` as `supabaseAdmin` for direct access

---

## ⚠️ Remaining Work

### Critical Files Still Using Prisma (500+ instances)

#### Core Library Files (~18 files remaining, ~30 instances)
- ✅ `src/lib/inviteCompletion.ts` - **COMPLETE**
- ✅ `src/lib/worker/processDocument.ts` - **COMPLETE**
- ✅ `src/lib/utils/invites.ts` - **COMPLETE**
- ✅ `src/lib/accessLog.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/versioning.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/permissions/orgAccess.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/permissions/guard.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/auth/guards.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/org/getOrgContext.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/security/apiTokens.ts` - **COMPLETE** (already migrated, types cleaned up)
- ✅ `src/lib/security/requireApiToken.ts` - **COMPLETE** (already migrated, types cleaned up)
- ✅ `src/lib/invite-lookup.ts` - **COMPLETE**
- ✅ `src/lib/documents/upload-guard.ts` - **COMPLETE**
- ✅ `src/lib/security/apiTokens.ts` - **COMPLETE**
- ✅ `src/lib/security/requireApiToken.ts` - **COMPLETE**
- ✅ `src/lib/auth/CurrentUser.ts` - **COMPLETE**
- ✅ `src/lib/documents/backfill-categories.ts` - **COMPLETE**
- ✅ `src/lib/billing/ledger.ts` - **COMPLETE**
- ✅ `src/lib/billing/archive-client.ts` - **COMPLETE**
- ✅ `src/lib/billing/active-estates.ts` - **COMPLETE**
- ✅ `src/lib/billing/requireActiveSubscription.ts` - **COMPLETE**
- ✅ `src/lib/billing/requireSubscription.ts` - **COMPLETE**
- ✅ `src/lib/contracts/features.ts` - **COMPLETE**
- ✅ `src/lib/contracts/acceptance.ts` - **COMPLETE**
- ✅ `src/lib/test-invites.ts` - **COMPLETE**

#### API Routes (~131 files, ~400 instances remaining)
- ✅ `src/app/api/clients/route.ts` - **COMPLETE**
- ✅ `src/app/api/clients/[id]/route.ts` - **COMPLETE**
- ✅ `src/app/api/clients/[id]/invite/route.ts` - **COMPLETE**
- ✅ `src/app/api/policies/route.ts` - **COMPLETE**
- ✅ `src/app/api/policies/[id]/route.ts` - **COMPLETE**
- ✅ `src/app/api/policies/[id]/beneficiaries/route.ts` - **COMPLETE**
- ✅ `src/app/api/policies/[id]/verify/route.ts` - **COMPLETE**
- ✅ `src/app/api/beneficiaries/route.ts` - **COMPLETE** (already migrated)
- ✅ `src/app/api/beneficiaries/[id]/route.ts` - **COMPLETE** (already migrated)
- Remaining routes in `src/app/api/` that contain `prisma.` calls need to be migrated.

---

## 🔧 Migration Patterns

### Pattern 1: Simple Queries

**Prisma:**
```typescript
const user = await prisma.user.findUnique({
  where: { clerkId: userId }
});
```

**Supabase:**
```typescript
const { findUnique } = await import("@/lib/db");
const user = await findUnique("users", { clerkId: userId });
```

### Pattern 2: Create Operations

**Prisma:**
```typescript
const client = await prisma.clients.create({
  data: { email, firstName, lastName }
});
```

**Supabase:**
```typescript
const { create } = await import("@/lib/db");
const client = await create("clients", {
  email, firstName, lastName,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

### Pattern 3: Update Operations

**Prisma:**
```typescript
await prisma.user.update({
  where: { id: userId },
  data: { role: "attorney" }
});
```

**Supabase:**
```typescript
const { update } = await import("@/lib/db");
await update("users", { id: userId }, { role: "attorney" });
```

### Pattern 4: Find Many with Relations

**Prisma:**
```typescript
const records = await prisma.access.findMany({
  where: { attorneyId: userId },
  include: { clients: true }
});
```

**Supabase:**
```typescript
const { findMany } = await import("@/lib/db");
const records = await findMany("access", {
  where: { attorneyId: userId }
});
// Then fetch related clients separately
const clientIds = records.map(r => r.clientId);
const clients = await findMany("clients", {
  where: { id: { in: clientIds } }
});
```

### Pattern 5: Transactions

**Prisma:**
```typescript
await prisma.$transaction(async (tx) => {
  const client = await tx.clients.create({...});
  await tx.access.create({...});
});
```

**Supabase:**
```typescript
const { transaction, create } = await import("@/lib/db");
await transaction(async (db) => {
  const client = await create("clients", {...});
  await create("access", {...});
});
// Note: This is sequential, not a true transaction
// For true ACID transactions, use Postgres functions
```

### Pattern 6: Raw SQL

**Prisma:**
```typescript
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM organizations WHERE id = $1`,
  orgId
);
```

**Supabase:**
```typescript
const { queryRaw } = await import("@/lib/db");
const result = await queryRaw(
  `SELECT * FROM organizations WHERE id = $1`,
  [orgId]
);
// Note: Requires Postgres function 'exec_raw_sql' in Supabase
```

---

## 📋 Next Steps

1. **Continue migrating core library files** (priority: high)
   - ✅ `src/lib/inviteCompletion.ts` - **COMPLETE**
   - ✅ `src/lib/worker/processDocument.ts` - **COMPLETE**
   - ✅ `src/lib/utils/invites.ts` - **COMPLETE**
   - Next: `src/lib/accessLog.ts`, `src/lib/versioning.ts`, `src/lib/permissions/orgAccess.ts`

2. **Migrate API routes** (priority: high) - **IN PROGRESS**
   - ✅ Client routes - **COMPLETE** (2 files)
   - ✅ Policy routes - **COMPLETE** (2 files)
   - ✅ Beneficiary routes - **COMPLETE** (2 files, already migrated)
   - Next: Billing routes, remaining client/policy sub-routes

3. **Handle Complex Queries**
   - Create Postgres functions for complex operations
   - Handle transactions properly
   - Optimize relationship queries

4. **Testing**
   - Test all migrated endpoints
   - Verify data integrity
   - Check performance

---

## ⚠️ Important Notes

1. **Table Names**: Supabase uses snake_case by default. Ensure table names match your schema.

2. **Timestamps**: Supabase stores timestamps as strings (ISO format). Convert Date objects to ISO strings.

3. **Transactions**: Supabase doesn't support client-side transactions. Use Postgres functions for true ACID transactions.

4. **Relations**: Supabase doesn't have Prisma's `include`. Fetch related data separately and join in code.

5. **Raw SQL**: Requires creating Postgres functions in Supabase. Example:
   ```sql
   CREATE OR REPLACE FUNCTION exec_raw_sql(sql_query text, sql_params jsonb)
   RETURNS jsonb AS $$
   BEGIN
     -- Implementation
   END;
   $$ LANGUAGE plpgsql;
   ```

---

**Last Updated:** January 2025
