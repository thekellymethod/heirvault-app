# Fix DIRECT_URL Username Format

## Current Issue

Your `DIRECT_URL` has the wrong username format:

### Current (WRONG):
```
DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Problem:** Username is `postgres.pgpnbtmgloextjpmxxgv` (pooled format)

### Correct Format:
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Fix:** Username should be just `postgres` (not `postgres.[REF]`)

---

## Username Format Differences

| Connection Type | Username Format | Example |
|----------------|-----------------|---------|
| **Pooled** (DATABASE_URL) | `postgres.[PROJECT-REF]` | `postgres.pgpnbtmgloextjpmxxgv` |
| **Direct** (DIRECT_URL) | `postgres` | `postgres` |

---

## Quick Fix

In your `.env.local`, change:

**From:**
```
DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**To:**
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Change:** `postgres.pgpnbtmgloextjpmxxgv` → `postgres`

---

## Best Practice: Copy from Supabase

The easiest way is to copy the exact string from Supabase:

1. Supabase Dashboard → Settings → Database
2. Connection string → **Direct connection** tab
3. Copy the **entire** string (it will have the correct format)
4. Paste into `.env.local`

This ensures you get the exact format Supabase expects.

---

## After Fixing

Test again:
```bash
npx prisma migrate status
```

If it still fails, the issue might be:
- Supabase project is paused (check dashboard)
- Network/firewall blocking
- IP allowlist enabled

