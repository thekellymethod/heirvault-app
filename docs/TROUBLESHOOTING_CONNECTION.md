# Troubleshooting Database Connection

## Issue: Can't Reach Database Server

If you're getting `P1001: Can't reach database server`, check these:

### 1. Verify Supabase Project is Active

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Check if your project shows as "Active" (not "Paused")
3. If paused, click "Restore" to activate it

### 2. Check Connection String Format

Your `DIRECT_URL` should look like:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

**Key points:**
- Port: `5432` (not 6543)
- Must include: `?sslmode=require`
- Host format: `db.[PROJECT-REF].supabase.co`

### 3. Verify Connection String from Supabase

1. Go to Supabase Dashboard → Your Project
2. Settings → Database
3. Connection string → **Direct connection** tab
4. Copy the **exact** connection string
5. Replace `DIRECT_URL` in `.env.local`

### 4. Check IP Allowlist (If Enabled)

1. Go to Supabase Dashboard → Your Project
2. Settings → Database → Connection Pooling
3. Check if "IP Allowlist" is enabled
4. If enabled, add your IP address or disable it for testing

### 5. Test with Pooled Connection First

Try using `DATABASE_URL` (pooled) to see if the issue is specific to direct connection:

```bash
# Temporarily in prisma.config.ts, change:
url: env("DATABASE_URL"),  // Instead of DIRECT_URL

# Then test:
npx prisma migrate status
```

**Note:** Migrations should use `DIRECT_URL`, but this test helps isolate the issue.

### 6. Verify Project Reference

Make sure the project reference in your connection string matches your Supabase project:
- Check Supabase Dashboard → Settings → General → Reference ID
- Compare with the reference in your connection string

### 7. Network/Firewall Issues

- Check if your firewall is blocking port 5432
- Try from a different network
- Check if your ISP blocks database connections

---

## Quick Diagnostic

Run these commands to check:

```powershell
# Check if DIRECT_URL is set
Get-Content .env.local | Select-String "DIRECT_URL"

# Test DNS resolution
nslookup db.[YOUR-PROJECT-REF].supabase.co

# Test connection (if tools available)
Test-NetConnection -ComputerName db.[YOUR-PROJECT-REF].supabase.co -Port 5432
```

---

## Alternative: Use Supabase Connection Pooler

If direct connection doesn't work, you can temporarily use the pooled connection for migrations (not recommended for production, but works for testing):

In `prisma.config.ts`:
```typescript
datasource: {
  url: env("DATABASE_URL"),  // Pooled connection (port 6543)
},
```

**Note:** This is a workaround. For production, always use `DIRECT_URL` for migrations.

---

## Still Not Working?

1. **Check Supabase Status**: Visit Supabase status page
2. **Verify Project**: Make sure project isn't deleted or suspended
3. **Contact Support**: If project is active but still can't connect, contact Supabase support

