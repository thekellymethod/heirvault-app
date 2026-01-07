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

### 2. Core Library Files - **9 FILES COMPLETE**
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

### 3. API Routes - **3 FILES COMPLETE**
- ✅ `src/app/api/clients/route.ts` - Client CRUD operations (GET, POST)
- ✅ `src/app/api/clients/[id]/route.ts` - Client detail operations (GET)
- ✅ `src/app/api/policies/route.ts` - Policy CRUD operations (GET, POST)
- ✅ `src/app/api/policies/[id]/route.ts` - Policy update/delete operations (PATCH, DELETE)
- ✅ `src/app/api/beneficiaries/route.ts` - Beneficiary CRUD operations (GET, POST) - Already migrated
- ✅ `src/app/api/beneficiaries/[id]/route.ts` - Beneficiary update/delete operations (PUT, DELETE) - Already migrated

### 4. Database Exports - **COMPLETE**
- ✅ Updated `src/lib/db/index.ts` to export Supabase helpers
- ✅ Exports `db` as `supabaseAdmin` for direct access

---

## ⚠️ Remaining Work

### Critical Files Still Using Prisma (500+ instances)

#### Core Library Files (20 files remaining, ~50 instances)
- ✅ `src/lib/inviteCompletion.ts` - **COMPLETE**
- ✅ `src/lib/worker/processDocument.ts` - **COMPLETE**
- ✅ `src/lib/utils/invites.ts` - **COMPLETE**
- ✅ `src/lib/accessLog.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/versioning.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/permissions/orgAccess.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/permissions/guard.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/auth/guards.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/org/getOrgContext.ts` - **COMPLETE** (already migrated)
- ✅ `src/lib/invite-lookup.ts` - **COMPLETE**
- ✅ `src/lib/documents/upload-guard.ts` - **COMPLETE**
- `src/lib/documents/backfill-categories.ts` - 3 instances
- `src/lib/billing/ledger.ts` - 1 instance
- `src/lib/billing/archive-client.ts` - 5 instances
- `src/lib/billing/active-estates.ts` - 2 instances
- `src/lib/billing/requireActiveSubscription.ts` - 1 instance
- `src/lib/billing/requireSubscription.ts` - 2 instances
- `src/lib/contracts/features.ts` - 1 instance
- `src/lib/contracts/acceptance.ts` - 3 instances
- `src/lib/test-invites.ts` - 4 instances
- `src/lib/utils/invites.ts` - 11 instances
- `src/lib/security/apiTokens.ts` - 2 instances
- `src/lib/security/requireApiToken.ts` - 2 instances
- `src/lib/invite-lookup.ts` - 1 instance

#### API Routes (~137 files, ~415 instances remaining)
- ✅ `src/app/api/clients/route.ts` - **COMPLETE**
- ✅ `src/app/api/clients/[id]/route.ts` - **COMPLETE**
- ✅ `src/app/api/policies/route.ts` - **COMPLETE**
- ✅ `src/app/api/policies/[id]/route.ts` - **COMPLETE**
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
