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

### 2. Core Library Files - **PARTIAL**
- ✅ `src/lib/utils/clerk.ts` - User authentication (getCurrentUser, requireAuth)
- ✅ `src/lib/audit.ts` - Audit logging
- ✅ `src/lib/authz.ts` - Authorization helpers
- ✅ `src/lib/client-limits.ts` - Client limit checking

### 3. API Routes - **PARTIAL**
- ✅ `src/app/api/clients/route.ts` - Client CRUD operations (GET, POST)

### 4. Database Exports - **COMPLETE**
- ✅ Updated `src/lib/db/index.ts` to export Supabase helpers
- ✅ Exports `db` as `supabaseAdmin` for direct access

---

## ⚠️ Remaining Work

### Critical Files Still Using Prisma (500+ instances)

#### Core Library Files (28 files, 74 instances)
- `src/lib/inviteCompletion.ts` - 3 instances
- `src/lib/accessLog.ts` - 2 instances
- `src/lib/versioning.ts` - 3 instances
- `src/lib/worker/processDocument.ts` - 8 instances
- `src/lib/permissions/orgAccess.ts` - 1 instance
- `src/lib/permissions/guard.ts` - 2 instances
- `src/lib/auth/guards.ts` - 1 instance
- `src/lib/org/getOrgContext.ts` - 1 instance
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

#### API Routes (140 files, 424 instances)
All routes in `src/app/api/` that contain `prisma.` calls need to be migrated.

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
   - `src/lib/inviteCompletion.ts`
   - `src/lib/worker/processDocument.ts`
   - `src/lib/utils/invites.ts`

2. **Migrate API routes** (priority: high)
   - Start with most-used routes
   - Client, Policy, Beneficiary routes
   - Billing routes

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
