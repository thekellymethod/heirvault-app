# Fix Connection String Format

## Current Issue

Your `DIRECT_URL` has the wrong format - the password is in the wrong place:

### Current (WRONG):
```
DIRECT_URL="postgresql://postgres.99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Problem:** 
- Username shows as `postgres.99xZvLSJ_NNmXT4` (password mixed with username)
- Missing the colon `:` separator between username and password

### Correct Format:
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Fix:**
- Username: `postgres` (not `postgres.99xZvLSJ_NNmXT4`)
- Format: `postgres:[PASSWORD]@` (colon `:` between username and password)

---

## Connection String Format

The correct PostgreSQL connection string format is:

```
postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?[PARAMETERS]
```

**Your case:**
```
postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require
```

**Breakdown:**
- `postgresql://` - protocol
- `postgres` - username
- `:` - separator (colon, not dot)
- `99xZvLSJ_NNmXT4` - password
- `@` - separator
- `db.pgpnbtmgloextjpmxxgv.supabase.co` - host
- `:5432` - port
- `/postgres` - database name
- `?sslmode=require` - parameters

---

## Quick Fix

In your `.env.local`, change:

**From:**
```
DIRECT_URL="postgresql://postgres.99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**To:**
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Key change:** `postgres.99xZvLSJ_NNmXT4` → `postgres:99xZvLSJ_NNmXT4` (dot to colon)

---

## Best Practice: Copy from Supabase

To avoid format issues, always copy the exact string from Supabase:

1. Supabase Dashboard → Settings → Database
2. Connection string → **Direct connection** tab
3. Copy the **entire** connection string shown
4. Paste directly into `.env.local` (don't modify it)

This ensures the format is exactly what Supabase expects.

---

## After Fixing

Test again:
```bash
npx prisma migrate status
```

If it still fails after fixing the format, check:
- Supabase project is active (not paused)
- IP allowlist settings
- Network/firewall blocking port 5432

