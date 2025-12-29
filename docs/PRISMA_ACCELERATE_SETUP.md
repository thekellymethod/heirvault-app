# Prisma Accelerate Setup - Clear Instructions

## Important: You Need THREE Different URLs

Your setup requires **three separate environment variables**:

1. **`DATABASE_URL`** = Your Supabase pooled connection string
2. **`DIRECT_URL`** = Your Supabase direct connection string  
3. **`PRISMA_ACCELERATE_URL`** = Your Prisma Accelerate URL

**DO NOT replace DATABASE_URL with the Accelerate URL!** Keep them separate.

---

## Step-by-Step Setup

### Step 1: Get Your Accelerate URL

1. Go to [Prisma Accelerate Dashboard](https://accelerate.prisma.io/)
2. Create or select your Accelerate project
3. Link it to your Supabase database
4. Copy the Accelerate URL (it will look like):
   ```
   prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
   ```

### Step 2: Set Environment Variables

In **Vercel** (or your `.env.local` for local testing):

#### Production Environment:
```
DATABASE_URL = postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

DIRECT_URL = postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require

PRISMA_ACCELERATE_URL = prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

#### Preview/Staging Environment:
```
DATABASE_URL = postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
(Staging Supabase pooled connection)

DIRECT_URL = postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require
(Staging Supabase direct connection)

PRISMA_ACCELERATE_URL = prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
(Can be same or different Accelerate project)
```

---

## How It Works

Your `prisma/schema.prisma` is already correctly configured:

```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")              // Supabase pooled connection
  directUrl = env("DIRECT_URL")          // Supabase direct connection
  accelerateUrl = env("PRISMA_ACCELERATE_URL")  // Accelerate URL
}
```

**What happens:**
- Prisma uses `DATABASE_URL` as fallback (if Accelerate is unavailable)
- Prisma uses `DIRECT_URL` for migrations (always direct connection)
- Prisma uses `PRISMA_ACCELERATE_URL` for runtime queries (when available)

Your code in `src/lib/prisma.ts` already handles this correctly:
- If `PRISMA_ACCELERATE_URL` exists, it uses Accelerate
- If not, it falls back to `DATABASE_URL`

---

## Common Confusion

### ❌ WRONG: Replacing DATABASE_URL with Accelerate URL
```
DATABASE_URL = prisma://accelerate.prisma-data.net/?api_key=...
```
**This breaks migrations and direct connections!**

### ✅ CORRECT: Keeping All Three Separate
```
DATABASE_URL = postgresql://... (Supabase pooled)
DIRECT_URL = postgresql://... (Supabase direct)
PRISMA_ACCELERATE_URL = prisma://... (Accelerate)
```

---

## Verification

After setting up, verify it works:

1. Visit: `https://heirvault.app/api/debug/env-health`
2. Check these fields:
   ```json
   {
     "database": {
       "urlConfigured": true,
       "directUrlConfigured": true,
       "accelerateUrlConfigured": true,
       "accelerateUrlValid": true  // Should be true
     }
   }
   ```

If `accelerateUrlValid: false`, check:
- Accelerate URL starts with `prisma://`
- Accelerate project is active (not paused)
- Accelerate project is linked to correct database

---

## Why You Need All Three

| Variable | Purpose | When Used |
|----------|---------|-----------|
| `DATABASE_URL` | Supabase pooled connection | Fallback if Accelerate unavailable |
| `DIRECT_URL` | Supabase direct connection | **Always** used for migrations |
| `PRISMA_ACCELERATE_URL` | Accelerate connection | Runtime queries (when available) |

**Migrations ALWAYS use DIRECT_URL** - never use Accelerate for migrations!

---

## Quick Setup Checklist

- [ ] Get Accelerate URL from Prisma Accelerate dashboard
- [ ] Set `PRISMA_ACCELERATE_URL` in Vercel (Production)
- [ ] Set `PRISMA_ACCELERATE_URL` in Vercel (Preview)
- [ ] Keep `DATABASE_URL` as Supabase connection (don't change it!)
- [ ] Keep `DIRECT_URL` as Supabase direct connection (don't change it!)
- [ ] Verify with `/api/debug/env-health` endpoint

---

## Summary

**The key point:** 
- Your `DATABASE_URL` stays as your Supabase connection string
- Your `PRISMA_ACCELERATE_URL` is a **separate** variable for the Accelerate URL
- Both are needed and serve different purposes

Your schema is already correct - just add the `PRISMA_ACCELERATE_URL` environment variable!

