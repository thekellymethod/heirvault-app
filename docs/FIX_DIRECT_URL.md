# Fix DIRECT_URL Connection

Your `DIRECT_URL` needs to include `?sslmode=require` for Supabase connections.

## Current Format (Missing SSL)

```
DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

## Correct Format (With SSL)

```
DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require"
```

## How to Fix

1. Open `.env.local` file
2. Find the `DIRECT_URL` line
3. Add `?sslmode=require` at the end (before the closing quote)
4. Save the file
5. Try `npx prisma migrate status` again

## Example

**Before:**
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres"
```

**After:**
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

---

## Alternative: Get Correct Connection String from Supabase

1. Go to Supabase Dashboard → Your Project
2. Settings → Database
3. Connection string → **Direct connection** tab
4. Copy the connection string (it already includes `?sslmode=require`)
5. Replace your `DIRECT_URL` in `.env.local`

