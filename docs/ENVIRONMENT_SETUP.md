# Environment Setup Guide

This guide provides the exact environment variable configuration for Production and Preview/Staging environments in Vercel.

## Overview

- **Production**: Live site with real users, uses production database and live Stripe keys
- **Preview/Staging**: Development and testing environment, uses staging database and test Stripe keys

---

## 1. Database Configuration

### Prisma Schema Requirements

Your `prisma/schema.prisma` is already correctly configured:

```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  accelerateUrl = env("PRISMA_ACCELERATE_URL")
}
```

### Production Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase Production connection string (pooled) | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase Production direct connection (for migrations) | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require` |
| `PRISMA_ACCELERATE_URL` | Prisma Accelerate URL for Production | `prisma://accelerate.prisma-data.net/?api_key=...` |

### Preview/Staging Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase Staging connection string (pooled) | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase Staging direct connection (for migrations) | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require` |
| `PRISMA_ACCELERATE_URL` | Prisma Accelerate URL for Staging (can use same or separate) | `prisma://accelerate.prisma-data.net/?api_key=...` |

**Important Notes:**
- `DIRECT_URL` must be set and valid for migrations to work correctly
- `PRISMA_ACCELERATE_URL` must be a valid `prisma://` URL format
- Both Production and Preview should have separate Supabase projects

---

## 2. Stripe Configuration

### Production Environment Variables

| Variable | Description | When to Use |
|----------|-------------|-------------|
| `STRIPE_SECRET_KEY` | Live Stripe secret key | Only when ready to accept real payments |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live Stripe publishable key | Only when ready to accept real payments |
| `STRIPE_WEBHOOK_SECRET` | Live webhook endpoint secret | Only when billing is enabled |
| `STRIPE_PRICE_FIRM` | Live price ID for firm subscription | Only when billing is enabled |

### Preview/Staging Environment Variables

| Variable | Description | When to Use |
|----------|-------------|-------------|
| `STRIPE_SECRET_KEY` | Test Stripe secret key (starts with `sk_test_`) | Always in Preview |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Test Stripe publishable key (starts with `pk_test_`) | Always in Preview |
| `STRIPE_WEBHOOK_SECRET` | Test webhook endpoint secret | Always in Preview |
| `STRIPE_PRICE_FIRM` | Test price ID for firm subscription | Always in Preview |

**Critical Rule:** Never mix test and live Stripe keys in the same environment.

---

## 3. Clerk Configuration

### Production Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key |
| `CLERK_SECRET_KEY` | Production Clerk secret key |

### Preview/Staging Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Same Clerk instance (or separate if preferred) |
| `CLERK_SECRET_KEY` | Same Clerk instance (or separate if preferred) |

**Note:** You can use the same Clerk instance for both environments, but ensure preview domains are allowed in Clerk dashboard.

---

## 4. Application URL

### Production Environment Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://heirvault.app` (or your production domain) |
| `APP_URL` | `https://heirvault.app` (or your production domain) |

### Preview/Staging Environment Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Preview URL (Vercel auto-generates) or omit |
| `APP_URL` | Preview URL (Vercel auto-generates) or omit |

**Note:** If omitted in Preview, the app will compute from request host.

---

## 5. Billing Feature Flag

### Production Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `BILLING_ENABLED` | `false` | Disable billing UI until ready for production |
| | `true` | Enable billing when ready to accept payments |

### Preview/Staging Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `BILLING_ENABLED` | `true` | Always enabled in Preview for testing |

**Behavior:**
- When `BILLING_ENABLED=false`: Billing page shows "Coming soon" message, checkout route is blocked
- When `BILLING_ENABLED=true`: Full billing functionality available
- Webhook route always works (needed for existing subscriptions)

---

## 6. Other Environment Variables

### Both Environments (Same Values)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `HEIRVAULT_STORAGE_BUCKET` | Storage bucket name |
| `SENTRY_DSN` | Sentry DSN (optional) |
| `HEIRVAULT_TOKEN_SECRET` | Token signing secret |

**Note:** These can be the same across environments, or use separate Supabase projects for complete isolation.

---

## 7. Complete Vercel Environment Variable Setup

### Setting Variables in Vercel

1. Go to your Vercel project settings
2. Navigate to **Settings > Environment Variables**
3. For each variable:
   - Add the variable name
   - Set the value
   - Select which environments it applies to:
     - **Production** only
     - **Preview** only
     - **Development** (local)
     - Or **All** (if same value)

### Recommended Setup Process

1. **Create Supabase Staging Project**
   - Create new project: `heirvault-staging`
   - Copy connection strings

2. **Set Preview Environment Variables First**
   - Configure all Preview variables
   - Use staging database
   - Use test Stripe keys
   - Set `BILLING_ENABLED=true`

3. **Test Preview Deployment**
   - Push a branch to trigger preview
   - Verify database connection
   - Test billing flow with test cards
   - Verify admin account works

4. **Configure Production Variables**
   - Set production database URLs
   - Keep `BILLING_ENABLED=false` until ready
   - When ready, switch to live Stripe keys and set `BILLING_ENABLED=true`

---

## 8. Verification Checklist

### Before Deploying to Production

- [ ] `DATABASE_URL` points to Production Supabase
- [ ] `DIRECT_URL` points to Production Supabase (direct connection)
- [ ] `PRISMA_ACCELERATE_URL` is valid and points to Production Accelerate
- [ ] `BILLING_ENABLED=false` (unless ready for payments)
- [ ] If billing enabled: All Stripe keys are **LIVE** keys
- [ ] `NEXT_PUBLIC_APP_URL` is production domain
- [ ] Admin account exists in Production database

### Before Deploying to Preview

- [ ] `DATABASE_URL` points to Staging Supabase
- [ ] `DIRECT_URL` points to Staging Supabase (direct connection)
- [ ] `PRISMA_ACCELERATE_URL` is valid (can be same or separate)
- [ ] `BILLING_ENABLED=true`
- [ ] All Stripe keys are **TEST** keys
- [ ] Preview domains allowed in Clerk

---

## 9. Troubleshooting

### "Admin missing" Error

1. Verify `DATABASE_URL` points to the correct database
2. Check that admin user exists in that database
3. Verify Clerk user ID matches the stored `clerkUserId` in database
4. Clear browser cache / incognito mode

### Prisma Accelerate Errors

1. Verify `PRISMA_ACCELERATE_URL` is a valid `prisma://` URL
2. Check Accelerate dashboard for connection status
3. Ensure Accelerate project is linked to correct database

### Billing Not Working

1. Check `BILLING_ENABLED=true` in environment
2. Verify Stripe keys match environment (test vs live)
3. Check webhook endpoint is configured in Stripe dashboard
4. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

### Migration Failures

1. Ensure `DIRECT_URL` is set and valid
2. Use direct connection (not pooled) for migrations
3. Check database permissions
4. Verify schema matches Prisma schema file

---

## 10. Quick Reference: Minimum Required Variables

### Production Minimum Set

```
DATABASE_URL=...
DIRECT_URL=...
PRISMA_ACCELERATE_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=https://heirvault.app
BILLING_ENABLED=false
```

### Preview Minimum Set

```
DATABASE_URL=... (staging)
DIRECT_URL=... (staging)
PRISMA_ACCELERATE_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
BILLING_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PRICE_FIRM=price_test_...
```

---

## Answers to Your Questions

### 1. Do you currently have DIRECT_URL set anywhere?

**Answer:** Yes, your Prisma schema requires `DIRECT_URL` and it's configured in the datasource. You need to ensure it's set in Vercel environment variables for both Production and Preview.

### 2. Are you using one Clerk instance for both preview and production, or separate?

**Answer:** This is your choice. You can use:
- **Same instance** (recommended for simplicity): Just ensure preview domains are allowed
- **Separate instances**: More isolation but requires managing two sets of users

For most cases, using the same Clerk instance is fine as long as preview domains are whitelisted.

---

## Next Steps

1. Create Supabase staging project
2. Set Preview environment variables in Vercel
3. Test Preview deployment
4. Keep Production `BILLING_ENABLED=false` until ready
5. When billing is ready, switch Production to live Stripe keys and enable billing

