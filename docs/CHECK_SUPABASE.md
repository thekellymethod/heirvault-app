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

### Get DATABASE_URL (pooled connection - use for everything)

**Note:** We only use the pooled connection (port 6543) for both runtime and migrations. Do not use direct connections (port 5432).

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

After getting the correct string from Supabase:

1. Open `.env.local` file
2. **Remove any `DIRECT_URL` line** (we don't use direct connections)
3. Replace `DATABASE_URL` with the exact string from Supabase (Connection pooling → Transaction tab)
4. **Make sure:**
   - No quotes around the URL
   - No extra spaces
   - Port is **6543** (not 5432)
   - Includes `?pgbouncer=true&connection_limit=1&sslmode=require`

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
- [ ] Copied DATABASE_URL from "Connection pooling → Transaction" tab
- [ ] DATABASE_URL uses port **6543** (not 5432)
- [ ] DATABASE_URL includes `?pgbouncer=true&connection_limit=1&sslmode=require`
- [ ] No `DIRECT_URL` in `.env.local` (removed)
- [ ] Updated `.env.local` with correct string (no quotes)
- [ ] Tested with `npx prisma migrate status`

---

## Next Steps

Once Supabase is verified and connection strings are updated:

1. Test migration: `npx prisma migrate status`
2. If successful, continue with testing: `docs/TESTING_START_HERE.md`
3. If still failing, check: `docs/TROUBLESHOOTING_CONNECTION.md`

