# Check Supabase Setup

Step-by-step guide to verify your Supabase project and get correct connection strings.

## Step 1: Verify Project Status

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Find your project: `pgpnbtmgloextjpmxxgv` (or search by name)
4. **Check the status:**
   - ✅ **Active** = Project is running (good!)
   - ⏸️ **Paused** = Project is paused (click "Restore" to activate)
   - ❌ **Deleted** = Project no longer exists (need to create new one)

**If paused:** Click the "Restore" button to activate it (may take a few minutes)

---

## Step 2: Get Correct Connection Strings

### Get DIRECT_URL (for migrations)

1. In Supabase Dashboard → Your Project
2. Click **Settings** (gear icon in left sidebar)
3. Click **Database** in settings menu
4. Scroll to **"Connection string"** section
5. Click **"Direct connection"** tab (NOT "Connection pooling")
6. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   ```
7. **Verify it includes:**
   - Port: `5432`
   - `?sslmode=require` at the end
   - Host: `db.[PROJECT-REF].supabase.co`

### Get DATABASE_URL (pooled, for runtime)

1. Same page: Settings → Database
2. **"Connection string"** section
3. Click **"Connection pooling"** tab
4. Select **"Transaction"** mode
5. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
6. **Verify it includes:**
   - Port: `6543`
   - `pgbouncer=true&connection_limit=1`
   - Host: `aws-0-[REGION].pooler.supabase.com`

---

## Step 3: Compare with Your Current Values

### Check Your Current DIRECT_URL

Your current value:
```
DIRECT_URL="postgresql://postgres:99xZvLSJ_NNmXT4@db.pgpnbtmgloextjpmxxgv.supabase.co:5432/postgres?sslmode=require"
```

**Compare with Supabase dashboard:**
- ✅ Port `5432` - correct
- ✅ `?sslmode=require` - correct
- ✅ Host format looks correct
- ⚠️ **Check if password matches** - verify in Supabase dashboard

### Check Your Current DATABASE_URL

Your current value:
```
DATABASE_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ_NNmXT4@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

**Compare with Supabase dashboard:**
- ✅ Port `6543` - correct
- ⚠️ **Missing** `?pgbouncer=true&connection_limit=1` - should be added
- ✅ Host format looks correct

---

## Step 4: Update Your .env.local

After getting the correct strings from Supabase:

1. Open `.env.local` file
2. Replace `DIRECT_URL` with the exact string from Supabase (Direct connection tab)
3. Replace `DATABASE_URL` with the exact string from Supabase (Connection pooling → Transaction tab)
4. **Make sure:**
   - No extra spaces
   - Quotes are correct
   - Connection strings are complete

---

## Step 5: Test Connection

After updating, test:

```bash
npx prisma migrate status
```

**Expected result:**
- ✅ Should connect successfully
- ✅ Should show migration status

**If still fails:**
- Check if project is paused (restore if needed)
- Verify password is correct
- Check if IP allowlist is blocking you
- Try from different network

---

## Common Issues

### Project is Paused
**Solution:** Click "Restore" in Supabase dashboard (takes 1-2 minutes)

### Password Mismatch
**Solution:** 
1. Go to Settings → Database
2. Click "Reset database password"
3. Copy new password
4. Update connection strings

### IP Allowlist Blocking
**Solution:**
1. Go to Settings → Database → Connection Pooling
2. Check "IP Allowlist" settings
3. Add your IP or disable allowlist for testing

### Connection String Format Wrong
**Solution:** Always copy directly from Supabase dashboard, don't type manually

---

## Quick Checklist

- [ ] Project status is "Active" (not paused)
- [ ] Copied DIRECT_URL from "Direct connection" tab
- [ ] Copied DATABASE_URL from "Connection pooling → Transaction" tab
- [ ] DIRECT_URL includes `?sslmode=require`
- [ ] DATABASE_URL includes `?pgbouncer=true&connection_limit=1`
- [ ] Updated `.env.local` with correct strings
- [ ] Tested with `npx prisma migrate status`

---

## Next Steps

Once Supabase is verified and connection strings are updated:

1. Test migration: `npx prisma migrate status`
2. If successful, continue with testing: `docs/TESTING_START_HERE.md`
3. If still failing, check: `docs/TROUBLESHOOTING_CONNECTION.md`

