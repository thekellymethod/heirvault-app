# Environment Variables Setup

**Last Updated:** January 2025  
**Status:** Production-Ready Configuration

This guide covers the exact environment variable configuration for HeirVault using Clerk + Prisma + Supabase Postgres.

---

## Required Environment Variables

### Database Connection (Supabase Postgres)

#### ✅ Runtime Connection (Pooler - Port 6543)

**For:** Next.js app runtime, API routes, server actions

```bash
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

**Parameters:**
- `sslmode=require` - **Required** for Supabase SSL connections
- `pgbouncer=true` - Helps Prisma behave with the pooler
- `connection_limit=1` - Helps avoid serverless connection storms

**Why Pooler (6543)?**
- ✅ Optimized for serverless/Next.js
- ✅ Connection pooling reduces overhead
- ✅ Better for high-concurrency requests
- ✅ Lower latency for API routes

---

#### ✅ Migration Connection (Direct - Port 5432)

**For:** Prisma migrations, schema changes, long transactions

```bash
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Parameters:**
- `sslmode=require` - **Required** for Supabase SSL connections

**Why Direct (5432)?**
- ✅ Required for Prisma migrations
- ✅ Supports long-running transactions
- ✅ Full PostgreSQL feature set
- ✅ Better for schema changes

**⚠️ Critical:** Always use direct connection for migrations. Pooler will cause migration failures.

---

## Local Development (`.env.local`)

Create `.env.local` in the project root:

```bash
# Database (Supabase Postgres)
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Optional: Prisma Accelerate (for better performance)
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY"

# App URL (for redirects)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Vercel Production

Set these in **Vercel Dashboard → Settings → Environment Variables**:

### Production Environment

```bash
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."

NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Preview/Staging Environment

Use staging Supabase project credentials:

```bash
DATABASE_URL="postgresql://postgres.STAGING_PROJECT:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.STAGING_PROJECT.supabase.co:5432/postgres?sslmode=require"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

NEXT_PUBLIC_APP_URL="https://your-preview-domain.vercel.app"
```

---

## Connection String Format

### Breaking Down the Pooler URL

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?[PARAMS]
```

**Example:**
```
postgresql://postgres.pgpnbtmgloextjpmxxgv:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
```

**Components:**
- `postgres.pgpnbtmgloextjpmxxgv` = Username (includes project ref)
- `PASSWORD` = Database password
- `aws-1-us-east-2.pooler.supabase.com` = Pooler hostname
- `6543` = Pooler port
- `postgres` = Database name
- `sslmode=require` = **Required** SSL mode
- `pgbouncer=true` = Enable connection pooling
- `connection_limit=1` = Limit per connection

---

## Common Pitfalls (Avoid These)

### ❌ Using Only Pooler for Migrations

**Problem:** Migrations will hang or fail with pooler connection.

**Solution:** Always use `DIRECT_URL` (port 5432) for migrations.

```bash
# Wrong - migrations will fail
DATABASE_URL="...pooler...:6543..."

# Correct - use DIRECT_URL for migrations
DIRECT_URL="...db....supabase.co:5432..."
```

---

### ❌ Not Adding `directUrl` to Prisma Schema

**Problem:** Prisma can't find direct connection for migrations.

**Solution:** Always include `directUrl` in `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // ← Required for migrations
}
```

---

### ❌ Creating New PrismaClient Per Request

**Problem:** Pool exhaustion in development (hot-reload creates many clients).

**Solution:** Use singleton pattern (already implemented in `src/lib/prisma.ts`):

```typescript
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

### ❌ Forgetting `?sslmode=require`

**Problem:** Connection fails with SSL error.

**Solution:** Always append `?sslmode=require` to connection strings:

```bash
# Wrong
DATABASE_URL="postgresql://...@host:port/db"

# Correct
DATABASE_URL="postgresql://...@host:port/db?sslmode=require"
```

---

## Verification

### Test Database Connection

```bash
# Check Prisma can connect
npx prisma db pull --preview-feature

# Check migration status
npx prisma migrate status
```

### Test Runtime Connection

```bash
# Start dev server
npm run dev

# Check API routes connect successfully
curl http://localhost:3000/api/health
```

---

## Security Best Practices

### ✅ DO

- ✅ Store passwords in environment variables (never in code)
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate passwords regularly
- ✅ Use connection pooling for runtime
- ✅ Use direct connections only for migrations
- ✅ Always include `sslmode=require`

### ❌ DON'T

- ❌ Commit connection strings to git
- ❌ Share passwords in chat/logs
- ❌ Use direct connections (5432) for runtime
- ❌ Skip SSL mode
- ❌ Use the same credentials across environments

---

## Quick Reference

| Use Case | Port | Environment Variable | Connection String |
|----------|------|----------------------|-------------------|
| Runtime (API routes) | 6543 | `DATABASE_URL` | Pooler with `pgbouncer=true` |
| Migrations | 5432 | `DIRECT_URL` | Direct connection |
| Prisma Accelerate | N/A | `PRISMA_ACCELERATE_URL` | Optional, for performance |

**Always include:** `?sslmode=require`

---

## Next Steps

1. ✅ Set `DATABASE_URL` with pooler (6543) + `sslmode=require&pgbouncer=true&connection_limit=1`
2. ✅ Set `DIRECT_URL` with direct (5432) + `sslmode=require`
3. ✅ Run migration: `npx prisma migrate dev --name init_registry_wedge`
4. ✅ Test connection: `npx prisma db pull`
5. ✅ Verify in app: Check API routes connect successfully

---

**Connection strings are like house keys—treat them with the same security.**
