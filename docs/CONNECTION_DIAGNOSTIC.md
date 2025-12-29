# Connection Diagnostic Steps

If `npx prisma migrate status` keeps failing with "Can't reach database server", try these steps:

## Step 1: Verify Supabase Project is Active

1. Go to https://supabase.com/dashboard
2. Check your project status
3. **If paused:** Click "Restore" and wait 2-3 minutes

## Step 2: Test Connection from Supabase Dashboard

1. Go to Supabase Dashboard → Your Project
2. Click **SQL Editor** in left sidebar
3. Try running a simple query: `SELECT 1;`
4. **If this works:** Database is accessible, issue is with local connection
5. **If this fails:** Database might be paused or having issues

## Step 3: Check IP Allowlist

1. Supabase Dashboard → Settings → Database
2. Scroll to **"Connection Pooling"** section
3. Check if **"IP Allowlist"** is enabled
4. **If enabled:**
   - Add your current IP address
   - Or disable it temporarily for testing

## Step 4: Verify Connection String Format

Your connection string should be exactly:

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

**Get it fresh from Supabase:**
1. Settings → Database → Connection string
2. **Direct connection** tab
3. Copy the **entire** string (including password)
4. Replace in `.env.local`

## Step 5: Test with psql (if available)

If you have PostgreSQL client installed:

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
```

**If psql connects:** Issue is with Prisma config
**If psql fails:** Issue is with network/database access

## Step 6: Check Network/Firewall

- Try from a different network (mobile hotspot, etc.)
- Check if your firewall is blocking port 5432
- Check if VPN is interfering
- Try from a different computer

## Step 7: Alternative - Use Supabase Connection Pooler

If direct connection doesn't work, you can temporarily use pooled connection for testing:

In `prisma.config.ts`:
```typescript
datasource: {
  url: env("DATABASE_URL"),  // Pooled connection (port 6543)
},
```

**Note:** This is a workaround. For production, always use DIRECT_URL for migrations.

---

## Quick Test: Can You Access Supabase Dashboard?

If you can:
- ✅ Access Supabase dashboard
- ✅ See your project
- ✅ Run SQL queries in SQL Editor

Then the issue is likely:
- Network/firewall blocking your local machine
- IP allowlist blocking your IP
- Connection string format issue

---

## Still Not Working?

1. **Contact Supabase Support** - They can check if there's an issue with your project
2. **Try from Different Network** - Rules out local network issues
3. **Check Supabase Status Page** - See if there are known issues
4. **Verify Project Reference** - Make sure you're using the correct project

