# Fix IPv6 Migration Issue - Use Supavisor

## Problem

- Supabase direct connections are **IPv6-only**
- Your local network doesn't support IPv6
- Migrations fail with `P1001: Can't reach database server`

## Solution: Use Supavisor Connection Pooler

Supavisor supports **both IPv4 and IPv6**, so it works even if your network only has IPv4.

---

## Step 1: Get Supavisor Connection String

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project: `pgpnbtmgloextjpmxxgv`

2. **Navigate to Connection Pooling:**
   - Settings → Database
   - Scroll to **"Connection Pooling"** section

3. **Find Supavisor Connection String:**
   - Look for connection string that starts with:
     ```
     postgresql://postgres.pgpnbtmgloextjpmxxgv:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - **OR** it might be:
     ```
     postgresql://postgres.pgpnbtmgloextjpmxxgv:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
     ```

4. **Add SSL Mode:**
   - Add `&sslmode=require` to the end:
     ```
     postgresql://postgres.pgpnbtmgloextjpmxxgv:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
     ```

---

## Step 2: Update .env.local

Add or update `DIRECT_URL` with the Supavisor connection string:

```env
# Use Supavisor (pooled) for migrations - supports IPv4
DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

**Important:** 
- Replace `[YOUR-PASSWORD]` with your actual database password
- Replace `[REGION]` with your actual region (e.g., `us-east-2`)

---

## Step 3: Update prisma.config.ts

Make sure `prisma.config.ts` uses `DIRECT_URL`:

```typescript
datasource: {
  url: env("DIRECT_URL"), // This will now use Supavisor (IPv4 compatible)
},
```

---

## Step 4: Test

```bash
npx prisma migrate status
```

Should now work! ✅

---

## Why This Works

- **Supavisor** = Supabase's connection pooler
- Supports **both IPv4 and IPv6**
- Works for migrations (unlike Prisma Accelerate)
- Free and available immediately

---

## Alternative Solutions

If Supavisor doesn't work for some reason:

1. **Enable IPv4 Add-on** (paid, Pro tier required)
2. **Configure IPv6** on your system/network
3. **Use different network** that supports IPv6 (mobile hotspot, etc.)

---

## Summary

1. Get Supavisor connection string from Supabase Dashboard
2. Add `&sslmode=require` to it
3. Set as `DIRECT_URL` in `.env.local`
4. Run `npx prisma migrate status` - should work!

