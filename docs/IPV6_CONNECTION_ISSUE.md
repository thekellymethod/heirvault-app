# IPv6 Connection Issue

## Problem

The database hostname `db.pgpnbtmgloextjpmxxgv.supabase.co` only resolves to IPv6:
- IPv6: `2600:1f16:1cd0:3330:37c5:b6f9:d2d1:db33`
- IPv4: **Not found**

This causes connection failures because:
- Node.js PostgreSQL client may not handle IPv6 correctly
- Your network may not support IPv6
- Prisma may not connect via IPv6

## Diagnosis

```bash
# DNS lookup shows only IPv6
nslookup db.pgpnbtmgloextjpmxxgv.supabase.co
# Result: 2600:1f16:1cd0:3330:37c5:b6f9:d2d1:db33 (IPv6 only)

# IPv4 lookup fails
nslookup -type=A db.pgpnbtmgloextjpmxxgv.supabase.co
# Result: No IPv4 address found
```

## Why This Happens

**Most likely cause:** Supabase project is **paused**

When a Supabase project is paused:
- DNS may only resolve to IPv6
- Direct connections are blocked
- Only pooled connections might work (if project is partially active)

## Solutions

### 1. Check Supabase Project Status (CRITICAL)

1. Go to https://supabase.com/dashboard
2. Find your project
3. Check if it shows:
   - ✅ **Active** → Project is running
   - ⏸️ **Paused** → **This is the problem!**

### 2. If Paused: Restore Project

1. Click **"Restore"** or **"Resume"**
2. Wait 2-3 minutes for activation
3. DNS should resolve to both IPv4 and IPv6
4. Try connection again

### 3. Verify Connection String

After restoring, verify in Supabase Dashboard:
- **Settings → Database → Connection String**
- **Direct connection** tab
- Copy the exact connection string
- Ensure it matches your `.env.local`

### 4. Alternative: Use Pooled Connection for Testing

If direct connection still fails, try using the **pooled connection** temporarily:

```env
# In .env.local, temporarily use pooled connection
DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

**Note:** Pooled connections work for queries but **NOT for migrations**. You'll need direct connection for `prisma migrate`.

## Next Steps

1. ✅ Check Supabase dashboard for project status
2. ✅ If paused, restore the project
3. ✅ Wait 2-3 minutes
4. ✅ Verify DNS resolves to IPv4: `nslookup -type=A db.pgpnbtmgloextjpmxxgv.supabase.co`
5. ✅ Try `npx prisma migrate status` again

## Expected Result After Fix

```bash
# DNS should resolve to IPv4
nslookup -type=A db.pgpnbtmgloextjpmxxgv.supabase.co
# Should show: IPv4 address (e.g., 54.xxx.xxx.xxx)

# Connection should work
npx prisma migrate status
# Should show: Database schema is up to date
```

---

## Summary

**Root Cause:** Supabase project is likely paused, causing DNS to only resolve to IPv6.

**Fix:** Restore the project in Supabase dashboard.

**Verification:** After restore, DNS should resolve to IPv4, and connections should work.

