# Get Supavisor Connection String (IPv4 Compatible)

## Why Supavisor?

Supabase direct connections are **IPv6-only**. If your network doesn't support IPv6, use **Supavisor** (connection pooler) which supports **both IPv4 and IPv6**.

## Steps to Get Supavisor Connection String

### 1. Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Sign in
3. Select your project: `pgpnbtmgloextjpmxxgv`

### 2. Navigate to Connection Pooling

1. Click **Settings** (gear icon in left sidebar)
2. Click **Database** in settings menu
3. Scroll to **"Connection Pooling"** section

### 3. Find Supavisor Connection String

Look for **"Supavisor"** or **"Connection Pooling"** connection string.

It should look like:
```
postgresql://postgres.pgpnbtmgloextjpmxxgv:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Or it might be:**
```
postgresql://postgres.pgpnbtmgloextjpmxxgv:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### 4. Add SSL Mode

Add `&sslmode=require` to the end:

```
postgresql://postgres.pgpnbtmgloextjpmxxgv:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

### 5. Update .env.local

Replace your `DIRECT_URL` with the Supavisor connection string:

```env
DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

**Important:** Replace `[YOUR-PASSWORD]` with your actual database password.

---

## Alternative: Use Your Existing DATABASE_URL

If you already have `DATABASE_URL` set up (which is likely a pooled connection), you can temporarily use that for migrations:

In `prisma.config.ts`, change:
```typescript
url: env("DATABASE_URL"),  // Instead of DIRECT_URL
```

This will use your existing pooled connection which should support IPv4.

---

## Test After Update

```bash
npx prisma migrate status
```

Should now work! ✅

---

## Note About Migrations

**Supavisor works for migrations** in most cases. If you encounter issues with specific migration commands, you may need to:
- Enable IPv4 add-on (paid, Pro tier)
- Or configure IPv6 on your system

But for 99% of use cases, Supavisor is sufficient.

