# Database Connection Setup Guide

**Last Updated:** January 2025  
**Status:** Production-Ready Configuration

This guide covers the exact database connection configuration for HeirVault using Supabase Postgres with Clerk authentication.

---

## Connection String Configuration

### ✅ Runtime Connection (Pooler - Port 6543)

**For:** Next.js app runtime, API routes, server actions

**Format:**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**Environment Variable:**
```bash
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

**Why Pooler (6543)?**
- ✅ Optimized for serverless/Next.js
- ✅ Connection pooling reduces overhead
- ✅ Better for high-concurrency requests
- ✅ Lower latency for API routes

---

### ✅ Migration Connection (Direct - Port 5432)

**For:** Prisma migrations, schema changes, long transactions

**Format:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

**Environment Variable:**
```bash
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Why Direct (5432)?**
- ✅ Required for Prisma migrations
- ✅ Supports long-running transactions
- ✅ Full PostgreSQL feature set
- ✅ Better for schema changes

---

## SSL Configuration

### ⚠️ Critical: Always Include `sslmode=require`

Supabase requires SSL connections. Always append `?sslmode=require` to your connection strings.

**Correct:**
```
postgresql://...@host:port/db?sslmode=require
```

**Incorrect:**
```
postgresql://...@host:port/db  # Missing SSL mode
```

### Self-Signed Certificate Handling

The application automatically handles Supabase's self-signed certificates by setting `rejectUnauthorized: false` in the connection pool configuration.

---

## Environment Variables Setup

### Local Development (`.env.local`)

```bash
# Runtime DB (pooler)
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"

# Migration DB (direct)
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"

# Optional: Prisma Accelerate (for better performance)
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY"
```

### Vercel Production

Set these in **Vercel Dashboard → Settings → Environment Variables**:

**Production:**
- `DATABASE_URL` = Pooler connection (6543) with `sslmode=require`
- `DIRECT_URL` = Direct connection (5432) with `sslmode=require` (for migrations)
- `PRISMA_ACCELERATE_URL` = Optional, for performance

**Preview/Staging:**
- Same structure, but use staging Supabase project credentials

---

## Prisma Configuration

### `prisma/schema.prisma`

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### `prisma.config.ts`

```typescript
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

// Validate DATABASE_URL format
function validateDatabaseUrl(url: string): void {
  const portMatch = url.match(/:(\d+)\//);
  if (!portMatch) {
    throw new Error(
      `Invalid DATABASE_URL: Missing port number. ` +
      `Expected format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?params\n` +
      `Got: ${url.substring(0, 50)}...`
    );
  }

  const port = parseInt(portMatch[1], 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid DATABASE_URL: Invalid port number "${portMatch[1]}". ` +
      `Port must be a number between 1 and 65535.\n` +
      `Expected: 6543 (pooled) or 5432 (direct)\n` +
      `Got: ${url.substring(0, 50)}...`
    );
  }

  if (port !== 6543 && port !== 5432) {
    console.warn(
      `[Prisma] Warning: DATABASE_URL uses port ${port}. ` +
      `Expected 6543 (pooled) or 5432 (direct) for Supabase.`
    );
  }
}

try {
  validateDatabaseUrl(databaseUrl);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`DATABASE_URL validation failed: ${message}`);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
```

---

## Runtime Connection (Application Code)

### Using Prisma Client

The application uses `@prisma/adapter-pg` for runtime connections:

```typescript
// src/lib/db.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Pooler: 6543
  ssl: process.env.DATABASE_URL?.includes("supabase")
    ? { rejectUnauthorized: false }
    : undefined,
});

const adapter = new PrismaPg({ pool });
export const prisma = new PrismaClient({ adapter });
```

### Using Direct pg Pool (for Custom Queries)

For custom SQL queries (like registry enforcement), use a direct pool:

```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Pooler: 6543
  ssl: process.env.DATABASE_URL?.includes("supabase")
    ? { rejectUnauthorized: false }
    : undefined,
});
```

---

## Migration Workflow

### Running Migrations

```bash
# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy
```

**Note:** Migrations use `DIRECT_URL` (port 5432) automatically via Prisma CLI.

---

## Connection String Components

### Breaking Down the Pooler URL

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?[PARAMS]
```

**Example:**
```
postgresql://postgres.pgpnbtmgloextjpmxxgv:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**Components:**
- `postgres.pgpnbtmgloextjpmxxgv` = Username (includes project ref)
- `PASSWORD` = Database password
- `aws-1-us-east-2.pooler.supabase.com` = Pooler hostname
- `6543` = Pooler port
- `postgres` = Database name
- `pgbouncer=true` = Enable connection pooling
- `connection_limit=1` = Limit per connection
- `sslmode=require` = **Required** SSL mode

---

## Security Best Practices

### ✅ DO

- ✅ Always use `sslmode=require` in connection strings
- ✅ Store passwords in environment variables (never in code)
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate passwords regularly
- ✅ Use connection pooling for runtime
- ✅ Use direct connections only for migrations

### ❌ DON'T

- ❌ Commit connection strings to git
- ❌ Share passwords in chat/logs
- ❌ Use direct connections (5432) for runtime
- ❌ Skip SSL mode
- ❌ Use the same credentials across environments

---

## Troubleshooting

### Error: "SSL connection is required"

**Solution:** Add `?sslmode=require` to your connection string.

### Error: "self-signed certificate"

**Solution:** The application automatically handles this. If you see this error, check that `rejectUnauthorized: false` is set in the Pool configuration.

### Error: "Invalid port number"

**Solution:** Verify your connection string includes the correct port:
- Pooler: `:6543`
- Direct: `:5432`

### Migrations Hang or Timeout

**Solution:** 
1. Verify `DIRECT_URL` is set correctly (port 5432)
2. Check network connectivity to Supabase
3. Ensure SSL mode is set: `?sslmode=require`

---

## Quick Reference

| Use Case | Port | Connection String |
|----------|------|-------------------|
| Runtime (API routes) | 6543 | `DATABASE_URL` (pooler) |
| Migrations | 5432 | `DIRECT_URL` (direct) |
| Prisma Accelerate | N/A | `PRISMA_ACCELERATE_URL` |

**Always include:** `?sslmode=require`

---

## Next Steps

1. ✅ Set `DATABASE_URL` with pooler (6543) + `sslmode=require`
2. ✅ Set `DIRECT_URL` with direct (5432) + `sslmode=require`
3. ✅ Run migration: `npx prisma migrate deploy`
4. ✅ Test connection: `npx prisma db pull` (dry run)
5. ✅ Verify in app: Check API routes connect successfully

---

**Connection strings are like house keys—treat them with the same security.**
