# Fix DIRECT_URL Format

## Current Issue

Your `DIRECT_URL` is using the **pooler host** instead of the **direct connection host**.

### Current (WRONG):
```
DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

**Problems:**
- ❌ Using pooler host: `aws-1-us-east-2.pooler.supabase.com`
- ❌ Missing `?sslmode=require`

### Correct Format:
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Correct:**
- ✅ Using direct host: `db.pgpnbtmgloextjpmxxgv.supabase.co`
- ✅ Port: `5432`
- ✅ Includes `?sslmode=require`
- ✅ Username format: `postgres` (not `postgres.[REF]`)

---

## How to Get the Correct Connection String

### Step 1: Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**

### Step 2: Get Direct Connection String

1. Scroll to **"Connection string"** section
2. Click **"Direct connection"** tab (NOT "Connection pooling")
3. Copy the **entire** connection string
4. It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require
   ```

### Step 3: Update .env.local

1. Open `.env.local`
2. Replace the `DIRECT_URL` line with the string you copied
3. Make sure it's exactly as shown in Supabase (no modifications)

---

## Key Differences

| Aspect | Pooled (DATABASE_URL) | Direct (DIRECT_URL) |
|--------|----------------------|---------------------|
| Host | `aws-0-[REGION].pooler.supabase.com` | `db.[PROJECT-REF].supabase.co` |
| Port | `6543` | `5432` |
| Username | `postgres.[REF]` | `postgres` |
| Parameters | `?pgbouncer=true&connection_limit=1` | `?sslmode=require` |

---

## Quick Fix

Update your `.env.local`:

**Change from:**
```
DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

**To:**
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Changes:**
1. Host: `aws-1-us-east-2.pooler.supabase.com` → `db.pgpnbtmgloextjpmxxgv.supabase.co`
2. Username: `postgres.pgpnbtmgloextjpmxxgv` → `postgres`
3. Add: `?sslmode=require` at the end

---

## After Fixing

Test again:
```bash
npx prisma migrate status
```

Should work now!

