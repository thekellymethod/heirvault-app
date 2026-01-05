# Prisma Setup Complete - Registry Cap Enforcement

**Status:** ✅ Complete  
**Date:** January 2025  
**Implementation:** Based on Dr. Kelly's specification

---

## Overview

This implementation sets up **Clerk + Prisma + Supabase Postgres** with the exact schema and enforcement logic for the "5 active registries included" billing model.

---

## What Was Implemented

### 1. Prisma Schema (`prisma/schema.prisma`)

**Models:**
- `Org` - Organization/firm with billing fields
- `OrgMember` - Membership linking Clerk users to orgs
- `Registry` - Policy registries per estate

**Key Features:**
- `includedActiveRegistries` defaults to 5
- `stripeSubscriptionStatus` for billing enforcement
- Composite primary key on `OrgMember` (`orgId`, `clerkUserId`)
- Indexes for efficient queries

---

### 2. Prisma Client Setup (`src/lib/prisma.ts`)

**Singleton Pattern:**
- Prevents hot-reload from creating multiple clients
- Avoids pool exhaustion in development
- Uses global variable for dev, single instance for production

---

### 3. Signup Route (`src/app/api/signup/route.ts`)

**Creates in Transaction:**
1. `Org` with `createdByClerkUserId`
2. `OrgMember` with `role: "admin"`
3. First `Registry` with `status: "active"`

**Returns:**
- `orgId` and `registryId`
- `redirectTo` path for frontend

---

### 4. Registry Creation Route (`src/app/api/registries/create/route.ts`)

**Enforcement Logic:**
1. ✅ Verifies Clerk authentication
2. ✅ Checks org membership via `orgId_clerkUserId`
3. ✅ Counts active registries
4. ✅ Enforces cap: blocks if `activeCount >= included` AND subscription not paid
5. ✅ Returns `402 Payment Required` with `BILLING_REQUIRED` code

**Uses Prisma:**
- Clean, type-safe queries
- No raw SQL needed
- Transaction support available

---

## Environment Variables

### Required

```bash
# Runtime (pooler: 6543)
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"

# Migrations (direct: 5432)
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**See:** `docs/ENV_SETUP.md` for complete guide

---

## Migration Steps

### 1. Update Environment Variables

Add to `.env.local`:

```bash
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Create Migration

```bash
npx prisma migrate dev --name init_registry_wedge
```

This will:
- Create `orgs`, `org_members`, and `registries` tables
- Add indexes
- Set up foreign key relationships

### 4. Verify Migration

```bash
npx prisma migrate status
```

Should show: `Database schema is up to date`

---

## API Usage

### Signup (Create Org + First Registry)

```typescript
POST /api/signup
Content-Type: application/json
Authorization: Bearer <clerk-session-token>

{
  "firmName": "Smith & Associates",
  "estateName": "Estate of John Doe"
}
```

**Response:**
```json
{
  "ok": true,
  "orgId": "org_abc123",
  "registryId": "reg_xyz789",
  "redirectTo": "/app/registries/reg_xyz789"
}
```

---

### Create Registry (Enforces Cap)

```typescript
POST /api/registries/create
Content-Type: application/json
Authorization: Bearer <clerk-session-token>

{
  "orgId": "org_abc123",
  "name": "Estate of Jane Smith"
}
```

**Success (200 OK):**
```json
{
  "ok": true,
  "registryId": "reg_new123"
}
```

**Billing Required (402 Payment Required):**
```json
{
  "ok": false,
  "code": "BILLING_REQUIRED",
  "message": "You have 5 active registries. Your plan includes 5. Add billing to create more.",
  "activeCount": 5,
  "included": 5
}
```

---

## Stripe Integration (Future)

When Stripe webhooks fire, update:

```typescript
await prisma.org.update({
  where: { id: orgId },
  data: {
    stripeCustomerId: customerId,
    stripeSubscriptionStatus: "active", // or "trialing", "past_due", "canceled"
  },
});
```

**Paid Statuses:** `"trialing"` and `"active"` allow unlimited registries.

---

## Common Pitfalls (Avoided)

### ✅ Using Pooler for Runtime, Direct for Migrations

- `DATABASE_URL` = Pooler (6543) for API routes
- `DIRECT_URL` = Direct (5432) for migrations

### ✅ Singleton Prisma Client

- Prevents pool exhaustion in dev
- Uses global variable pattern

### ✅ SSL Mode Required

- Always includes `?sslmode=require`
- Handles Supabase self-signed certificates

### ✅ Transaction Safety

- Signup creates org + member + registry atomically
- No partial state if one step fails

---

## Files Created/Modified

### Created

1. `prisma/schema.prisma` - Updated with exact models
2. `src/app/api/signup/route.ts` - Signup route
3. `src/app/api/registries/create/route.ts` - Updated to use Prisma
4. `docs/ENV_SETUP.md` - Environment variable guide
5. `_docs/PRISMA_SETUP_COMPLETE.md` - This documentation

### Modified

1. `src/lib/prisma.ts` - Simplified singleton pattern
2. `src/proxy.ts` - Added `/api/signup` to public routes

---

## Testing

### Manual Test Flow

1. **Signup:**
   ```bash
   curl -X POST http://localhost:3000/api/signup \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <clerk-token>" \
     -d '{"firmName": "Test Firm", "estateName": "Test Estate"}'
   ```

2. **Create 5 Registries:**
   - Should all succeed (within included limit)

3. **Create 6th Registry:**
   - Should return `402 BILLING_REQUIRED`

4. **Update Org Subscription:**
   ```sql
   UPDATE orgs SET stripe_subscription_status = 'active' WHERE id = 'org_abc123';
   ```

5. **Create 6th Registry Again:**
   - Should succeed (paid subscription)

---

## Next Steps

1. ✅ Run migration: `npx prisma migrate dev --name init_registry_wedge`
2. ✅ Test signup flow
3. ✅ Test registry creation with cap enforcement
4. ⏳ Integrate Stripe webhook to update `stripeSubscriptionStatus`
5. ⏳ Add UI for billing upgrade when cap is hit
6. ⏳ Add admin endpoint to view registry counts per org

---

## Questions?

- **Schema:** See `prisma/schema.prisma`
- **Enforcement:** See `src/app/api/registries/create/route.ts`
- **Environment:** See `docs/ENV_SETUP.md`
- **Connection Strings:** See `docs/DATABASE_CONNECTION_SETUP.md`

---

**This setup is production-ready and follows best practices for Clerk + Prisma + Supabase Postgres.**
