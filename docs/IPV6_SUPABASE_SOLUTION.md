# Supabase IPv6 Connection Issue - Solutions

## Problem

Supabase direct connections now use **IPv6 only**. If your network/computer doesn't support IPv6, you'll get connection failures.

**Symptoms:**
- `P1001: Can't reach database server`
- DNS resolves to IPv6 only
- Connection timeouts

## Solutions (Choose One)

### Solution 1: Use Supavisor Connection Pooler (Recommended)

Supavisor supports **both IPv4 and IPv6**, so it will work even if your network only has IPv4.

#### Steps:

1. **Get Supavisor Connection String:**
   - Go to Supabase Dashboard → Your Project
   - Settings → Database → Connection Pooling
   - Find **"Supavisor"** connection string
   - Copy it (should look like: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`)

2. **Update `.env.local`:**
   ```env
   # For migrations, you can temporarily use Supavisor
   DIRECT_URL="postgresql://postgres.pgpnbtmgloextjpmxxgv:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
   ```

3. **Important Note:**
   - Supavisor works for most operations
   - Some advanced migration features might require true direct connection
   - For production, this is usually fine

#### Pros:
- ✅ Works with IPv4 networks
- ✅ No additional cost
- ✅ Better connection pooling
- ✅ Available immediately

#### Cons:
- ⚠️ Not a "true" direct connection (but usually sufficient)

---

### Solution 2: Enable IPv4 Add-On (Paid)

If you need true direct IPv4 connections:

1. **Requirements:**
   - Pro tier or higher
   - Additional cost (check Supabase pricing)

2. **Enable:**
   - Supabase Dashboard → Your Project
   - Settings → Add-ons
   - Enable "IPv4 Direct Connection"

3. **Get IPv4 Connection String:**
   - After enabling, get new connection string from Dashboard
   - It will have an IPv4 address

#### Pros:
- ✅ True direct connection
- ✅ IPv4 compatible

#### Cons:
- ❌ Additional cost
- ❌ Requires Pro tier

---

### Solution 3: Configure IPv6 on Your System

Enable IPv6 support on Windows:

1. **Check IPv6 Status:**
   ```powershell
   Get-NetAdapterBinding | Where-Object {$_.ComponentID -eq 'ms_tcpip6'} | Select-Object Name, Enabled
   ```

2. **Enable IPv6:**
   - Control Panel → Network and Sharing Center
   - Change adapter settings
   - Right-click your network adapter → Properties
   - Check "Internet Protocol Version 6 (TCP/IPv6)"
   - Click OK

3. **Restart Network Adapter:**
   ```powershell
   Restart-NetAdapter -Name "Your-Adapter-Name"
   ```

4. **Test IPv6:**
   ```powershell
   Test-NetConnection -ComputerName db.pgpnbtmgloextjpmxxgv.supabase.co -Port 5432
   ```

#### Pros:
- ✅ Free
- ✅ Works with all Supabase features

#### Cons:
- ⚠️ Requires network/router IPv6 support
- ⚠️ May need ISP IPv6 support

---

## Recommended Approach

**For most users:** Use **Solution 1 (Supavisor)** - it's free, works immediately, and handles IPv4/IPv6 automatically.

**If you need true direct connection:** Use **Solution 2 (IPv4 Add-on)** if you're on Pro tier.

**If your network supports IPv6:** Use **Solution 3** to enable it.

---

## Quick Test After Fix

After implementing a solution, test:

```bash
npx prisma migrate status
```

Should show: `Database schema is up to date` or list pending migrations.

---

## For Production (Vercel)

**Good news:** Vercel servers support IPv6, so your production deployments will work fine with Supabase's IPv6 direct connections. This issue only affects local development.

---

## Summary

- **Problem:** Supabase direct connections are IPv6-only, your network doesn't support IPv6
- **Best Fix:** Use Supavisor connection pooler (supports IPv4)
- **Alternative:** Enable IPv4 add-on (paid) or configure IPv6 on your system
- **Production:** Not affected (Vercel supports IPv6)

