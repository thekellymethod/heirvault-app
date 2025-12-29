# Supabase Setup Guide

This guide walks you through setting up Supabase for both Production and Staging environments.

## Overview

You need **two separate Supabase projects**:
1. **Production** - For live users
2. **Staging** - For development and testing

---

## Step 1: Create Supabase Projects

### Create Production Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Click **"New Project"**
4. Fill in the details:
   - **Name**: `heirvault-production` (or your preferred name)
   - **Database Password**: Create a strong password (save this securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Select your plan
5. Click **"Create new project"**
6. Wait for project to initialize (2-3 minutes)

### Create Staging Project

1. In the same Supabase dashboard, click **"New Project"** again
2. Fill in the details:
   - **Name**: `heirvault-staging` (or your preferred name)
   - **Database Password**: Create a different strong password (save this securely)
   - **Region**: Can be same or different from production
   - **Pricing Plan**: Free tier is fine for staging
3. Click **"Create new project"**
4. Wait for project to initialize (2-3 minutes)

---

## Step 2: Get Connection Strings

For each project (Production and Staging), you need **two connection strings**:

### Pooled Connection String (for `DATABASE_URL`)

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Scroll to **"Connection string"** section
4. Select **"Connection pooling"** tab
5. Select **"Transaction"** mode
6. Copy the connection string (it will look like):
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
7. This is your **`DATABASE_URL`** (pooled, for runtime queries)

### Direct Connection String (for `DIRECT_URL`)

1. In the same **Settings** → **Database** page
2. Select **"Direct connection"** tab
3. Copy the connection string (it will look like):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   ```
4. This is your **`DIRECT_URL`** (direct, for migrations)

**Important Notes:**
- **Pooled connection** (`DATABASE_URL`) uses port `6543` and includes `pgbouncer=true`
- **Direct connection** (`DIRECT_URL`) uses port `5432` and includes `sslmode=require`
- Both should point to the **same database** (same project)
- Never use pooled connection for migrations - always use direct connection

---

## Step 3: Set Up Prisma Accelerate (Optional but Recommended)

### For Production

1. Go to [Prisma Accelerate Dashboard](https://accelerate.prisma.io/)
2. Create a new Accelerate project (or use existing)
3. Link it to your **Production** Supabase database
4. Copy the Accelerate URL (starts with `prisma://`)
5. This is your **`PRISMA_ACCELERATE_URL`** for Production

### For Staging

1. Create a separate Accelerate project for staging (or use same)
2. Link it to your **Staging** Supabase database
3. Copy the Accelerate URL
4. This is your **`PRISMA_ACCELERATE_URL`** for Preview/Staging

**Note:** You can use the same Accelerate project for both, but separate projects provide better isolation.

---

## Step 4: Run Migrations

### Production Database

1. Set your local environment to point to production:
   ```bash
   # In .env.local (temporarily)
   DATABASE_URL="[Production pooled connection string]"
   DIRECT_URL="[Production direct connection string]"
   PRISMA_ACCELERATE_URL="[Production Accelerate URL]"
   ```

2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

4. Verify connection:
   ```bash
   npx prisma db pull  # Should succeed without errors
   ```

### Staging Database

1. Update your local environment to point to staging:
   ```bash
   # In .env.local
   DATABASE_URL="[Staging pooled connection string]"
   DIRECT_URL="[Staging direct connection string]"
   PRISMA_ACCELERATE_URL="[Staging Accelerate URL]"
   ```

2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

4. Verify connection:
   ```bash
   npx prisma db pull  # Should succeed without errors
   ```

---

## Step 5: Configure Vercel Environment Variables

### Production Environment

In Vercel dashboard → Your Project → Settings → Environment Variables:

**Database:**
```
DATABASE_URL = [Production pooled connection string]
DIRECT_URL = [Production direct connection string]
PRISMA_ACCELERATE_URL = [Production Accelerate URL]
```

**Apply to:** Production only

### Preview Environment

**Database:**
```
DATABASE_URL = [Staging pooled connection string]
DIRECT_URL = [Staging direct connection string]
PRISMA_ACCELERATE_URL = [Staging Accelerate URL]
```

**Apply to:** Preview, Development, or All (except Production)

---

## Step 6: Verify Setup

### Test Production Connection

1. Visit your production site: `https://heirvault.app/api/debug/env-health`
2. Check the response:
   ```json
   {
     "database": {
       "urlConfigured": true,
       "directUrlConfigured": true,
       "accelerateUrlConfigured": true,
       "accelerateUrlValid": true,
       "urlsMatch": true
     }
   }
   ```
3. Verify `dbFingerprint` matches your production Supabase hostname

### Test Staging Connection

1. Create a preview deployment (push a branch)
2. Visit: `https://[preview-url].vercel.app/api/debug/env-health`
3. Check the response shows staging database fingerprint
4. Verify it's different from production fingerprint

---

## Step 7: Set Up Supabase Storage (If Needed)

If you're using Supabase Storage for file uploads:

### Production

1. Go to Production project → **Storage**
2. Create buckets as needed
3. Set bucket policies (public/private)
4. Copy bucket names to Vercel:
   ```
   HEIRVAULT_STORAGE_BUCKET = [your-bucket-name]
   ```

### Staging

1. Go to Staging project → **Storage**
2. Create same buckets
3. Set same policies
4. Use same bucket name in Preview environment

---

## Step 8: Set Up Supabase API Keys

### Production

1. Go to Production project → **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Staging

1. Go to Staging project → **Settings** → **API**
2. Copy the same keys
3. Use in Preview environment

**Note:** You can use the same keys in both environments if you want, or separate them for better isolation.

---

## Common Issues and Solutions

### Issue: "Connection refused" or "Connection timeout"

**Solution:**
- Verify you're using the correct connection string type (pooled vs direct)
- Check that your IP is not blocked in Supabase dashboard
- Ensure you're using the correct port (6543 for pooled, 5432 for direct)

### Issue: "Migration fails with connection error"

**Solution:**
- Always use `DIRECT_URL` for migrations (not `DATABASE_URL`)
- Ensure `DIRECT_URL` uses port 5432 (not 6543)
- Check that `DIRECT_URL` doesn't have `pgbouncer=true` parameter

### Issue: "Accelerate URL invalid"

**Solution:**
- Verify Accelerate URL starts with `prisma://`
- Check that Accelerate project is linked to correct database
- Ensure Accelerate project is active (not paused)

### Issue: "Database fingerprints don't match"

**Solution:**
- This is expected if Production and Staging are different projects
- Verify `urlsMatch: true` within the same environment
- If `urlsMatch: false` in same environment, check that `DATABASE_URL` and `DIRECT_URL` point to same project

---

## Security Best Practices

1. **Never commit connection strings** to git
2. **Use different passwords** for Production and Staging
3. **Rotate passwords** periodically
4. **Restrict database access** in Supabase dashboard (IP allowlist if needed)
5. **Use service role key** only server-side (never in client code)
6. **Monitor database usage** in Supabase dashboard

---

## Quick Reference: Connection String Types

| Type | Port | Use Case | Parameter |
|------|------|----------|-----------|
| Pooled (Transaction) | 6543 | Runtime queries (`DATABASE_URL`) | `pgbouncer=true` |
| Direct | 5432 | Migrations (`DIRECT_URL`) | `sslmode=require` |

---

## Next Steps

After Supabase is set up:

1. ✅ Verify both databases are accessible via `/api/debug/env-health`
2. ✅ Run migrations on both databases
3. ✅ Test admin user creation in staging
4. ✅ Configure Vercel environment variables
5. ✅ Test preview deployment with staging database
6. ✅ Verify production still works with production database

---

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Accelerate Documentation](https://www.prisma.io/docs/accelerate)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

