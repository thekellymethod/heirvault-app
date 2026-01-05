# Registry Cap Enforcement Implementation

**Status:** ✅ Complete  
**Date:** January 2025  
**Author:** Implementation based on Dr. Kelly's specification

---

## Overview

This implementation enforces the **"5 active registries included"** billing model server-side, using Clerk for authentication and Supabase Postgres for data persistence. The enforcement logic prevents users from creating more than 5 active registries unless they have an active Stripe subscription.

---

## Database Schema Changes

### Migration: `add_registry_cap_enforcement`

**File:** `prisma/migrations/add_registry_cap_enforcement/migration.sql`

#### Added Fields to `organizations` Table

```sql
ALTER TABLE "organizations" 
ADD COLUMN IF NOT EXISTS "created_by_clerk_user_id" TEXT,
ADD COLUMN IF NOT EXISTS "included_active_registries" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS "stripe_subscription_status" TEXT NOT NULL DEFAULT 'none';
```

**Fields:**
- `created_by_clerk_user_id` - Tracks which Clerk user created the organization
- `included_active_registries` - Number of active registries included in base plan (default: 5)
- `stripe_subscription_status` - Stripe subscription status: `none`, `active`, `trialing`, `past_due`, `canceled`, etc.

#### New `registries` Table

```sql
CREATE TABLE IF NOT EXISTS "registries" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "org_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'archived')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMP(3)
);
```

**Indexes:**
- `registries_org_status_idx` - For efficient active registry counting
- `registries_archived_at_idx` - For archived registry queries

#### Updated `org_members` Table

```sql
ALTER TABLE "org_members" ADD COLUMN "clerk_user_id" TEXT;
```

Allows direct lookup by Clerk user ID (in addition to existing `user_id` foreign key).

---

## Enforcement Logic

### API Route: `/api/registries/create`

**File:** `src/app/api/registries/create/route.ts`

**Enforcement Steps:**

1. **Authentication Check**
   - Verifies user is authenticated via Clerk (`userId` from `auth()`)
   - Returns `401 Unauthorized` if not authenticated

2. **Membership Verification**
   - Checks if user is a member of the specified organization
   - Looks up via `clerk_user_id` or `user.clerkId`
   - Returns `403 Forbidden` if not a member

3. **Organization Lookup**
   - Retrieves organization's `included_active_registries` (default: 5)
   - Retrieves `stripe_subscription_status`
   - Returns `404 Not Found` if organization doesn't exist

4. **Active Registry Count**
   - Counts active registries for the organization: `WHERE org_id = $1 AND status = 'active'`
   - Compares count against included limit

5. **Cap Enforcement**
   - If `activeCount >= included` AND subscription status is NOT `active` or `trialing`:
     - Returns `402 Payment Required` with error code `BILLING_REQUIRED`
     - Includes message: `"You have X active registries. Your plan includes Y. Add billing to create more."`

6. **Registry Creation**
   - If under limit OR has paid subscription:
     - Creates new registry with `status = 'active'`
     - Returns `200 OK` with `registryId`

---

## Connection String Configuration

### ✅ Runtime Connection (Pooler - Port 6543)

**For:** Next.js app runtime, API routes

```bash
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

**Why Pooler?**
- Optimized for serverless/Next.js
- Connection pooling reduces overhead
- Better for high-concurrency requests

### ✅ Migration Connection (Direct - Port 5432)

**For:** Prisma migrations, schema changes

```bash
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Why Direct?**
- Required for Prisma migrations
- Supports long-running transactions
- Full PostgreSQL feature set

**⚠️ Critical:** Always include `?sslmode=require` in connection strings.

---

## API Usage

### Create Registry Request

```typescript
POST /api/registries/create
Content-Type: application/json
Authorization: Bearer <clerk-session-token>

{
  "orgId": "org_abc123",
  "name": "Estate of John Doe"
}
```

### Success Response (200 OK)

```json
{
  "ok": true,
  "registryId": "reg_xyz789"
}
```

### Billing Required Response (402 Payment Required)

```json
{
  "ok": false,
  "code": "BILLING_REQUIRED",
  "message": "You have 5 active registries. Your plan includes 5. Add billing to create more.",
  "activeCount": 5,
  "included": 5
}
```

### Error Responses

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not a member of the organization
- `404 Not Found` - Organization not found
- `400 Bad Request` - Missing `orgId` or `name`
- `500 Internal Server Error` - Database or server error

---

## Stripe Integration (Future)

Once billing is enabled, compute monthly billable registries:

```typescript
const billable = Math.max(activeRegistries - 5, 0);
// Report to Stripe as metered line item: $8 per registry
```

**Stripe Subscription Statuses:**
- `active` - Paid subscription active
- `trialing` - In trial period (treated as paid)
- `past_due` - Payment failed (treated as unpaid)
- `canceled` - Subscription canceled (treated as unpaid)
- `none` - No subscription (default)

---

## Testing

### Manual Testing

1. **Create 5 registries** (should succeed)
2. **Create 6th registry** (should return `402 BILLING_REQUIRED`)
3. **Update org's `stripe_subscription_status` to `active`**
4. **Create 6th registry again** (should succeed)

### Test Script

```bash
# Set up test environment
export DATABASE_URL="postgresql://..."
export CLERK_SECRET_KEY="..."

# Run migration
npx prisma migrate deploy

# Test API (requires valid Clerk session)
curl -X POST http://localhost:3000/api/registries/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-session-token>" \
  -d '{"orgId": "test_org", "name": "Test Registry"}'
```

---

## Security Considerations

### ✅ Server-Side Enforcement

- All checks happen server-side (no client-side bypass)
- Membership verification uses database queries (no trust in client)
- Active count is calculated from database (not cached)

### ✅ Authentication Required

- Route requires Clerk authentication
- User must be a member of the organization
- No anonymous access

### ✅ Input Validation

- `orgId` and `name` are required
- `name` is trimmed before insertion
- SQL injection prevented via parameterized queries

---

## Migration Instructions

### 1. Run Migration

```bash
# Apply migration
npx prisma migrate deploy

# Or in development
npx prisma migrate dev --name add_registry_cap_enforcement
```

### 2. Update Existing Organizations

```sql
-- Set default values for existing orgs
UPDATE organizations 
SET 
  included_active_registries = 5,
  stripe_subscription_status = COALESCE(billing_status, 'none')
WHERE included_active_registries IS NULL OR stripe_subscription_status IS NULL;
```

### 3. Backfill Clerk User IDs (Optional)

```sql
-- Populate clerk_user_id in org_members from users.clerkId
UPDATE org_members om
SET clerk_user_id = u."clerkId"
FROM users u
WHERE om.user_id = u.id AND om.clerk_user_id IS NULL;
```

---

## Files Created/Modified

### Created

1. `prisma/migrations/add_registry_cap_enforcement/migration.sql`
   - Database schema changes

2. `src/app/api/registries/create/route.ts`
   - Enforcement API route

3. `docs/DATABASE_CONNECTION_SETUP.md`
   - Connection string configuration guide

4. `_docs/REGISTRY_CAP_ENFORCEMENT.md`
   - This documentation

### Modified

1. `src/proxy.ts`
   - Removed `/api/registries` from public routes (requires auth)

---

## Next Steps

1. ✅ Run migration: `npx prisma migrate deploy`
2. ✅ Test enforcement logic with 5+ registries
3. ⏳ Integrate Stripe webhook to update `stripe_subscription_status`
4. ⏳ Add UI for billing upgrade when cap is hit
5. ⏳ Add admin endpoint to view registry counts per org

---

## Questions?

- **Connection strings:** See `docs/DATABASE_CONNECTION_SETUP.md`
- **Enforcement logic:** See `src/app/api/registries/create/route.ts`
- **Database schema:** See `prisma/migrations/add_registry_cap_enforcement/migration.sql`

---

**This is the enforcement logic that matters—it's server-side, database-backed, and can't be bypassed by clients.**
