# Test Setup Guide

This guide helps you verify that your environment configuration is working correctly.

## Prerequisites

Before testing, ensure you have:
- ✅ Supabase projects created (Production and Staging)
- ✅ Vercel environment variables configured
- ✅ Migrations run on both databases
- ✅ Debug endpoints deployed

---

## Test 1: Environment Health Check

### Production Environment

1. Visit: `https://heirvault.app/api/debug/env-health`
2. Verify the response shows:

```json
{
  "environment": "production",
  "database": {
    "urlConfigured": true,
    "directUrlConfigured": true,
    "accelerateUrlConfigured": true,
    "accelerateUrlValid": true,
    "urlsMatch": true
  },
  "clerk": {
    "configured": true,
    "keyPrefix": "pk_live",
    "publishableKeyPresent": true,
    "secretKeyPresent": true
  },
  "stripe": {
    "configured": true,
    "mode": "live",  // or "test" if not ready
    "secretKeyPresent": true,
    "publishableKeyPresent": true
  },
  "billing": {
    "enabled": false,  // Should be false in Production
    "flagValue": "false"
  },
  "security": {
    "hasPublicClerkSecret": false  // CRITICAL: Must be false
  }
}
```

**✅ Pass Criteria:**
- All database fields are `true`
- `database.urlsMatch: true` (DATABASE_URL and DIRECT_URL point to same host)
- `clerk.configured: true`
- `billing.enabled: false` (Production)
- `security.hasPublicClerkSecret: false` (security check)

### Preview/Staging Environment

1. Create a preview deployment (push a branch)
2. Visit: `https://[preview-url].vercel.app/api/debug/env-health`
3. Verify the response shows:

```json
{
  "environment": "production",  // or "development"
  "database": {
    "urlConfigured": true,
    "directUrlConfigured": true,
    "accelerateUrlConfigured": true,
    "accelerateUrlValid": true,
    "urlsMatch": true
  },
  "clerk": {
    "configured": true,
    "keyPrefix": "pk_live",  // or "pk_test"
    "publishableKeyPresent": true,
    "secretKeyPresent": true
  },
  "stripe": {
    "configured": true,
    "mode": "test",  // Should be "test" in Preview
    "secretKeyPresent": true,
    "publishableKeyPresent": true
  },
  "billing": {
    "enabled": true,  // Should be true in Preview
    "flagValue": "true"
  },
  "security": {
    "hasPublicClerkSecret": false
  }
}
```

**✅ Pass Criteria:**
- All database fields are `true`
- `database.urlsMatch: true`
- `stripe.mode: "test"` (Preview should use test keys)
- `billing.enabled: true` (Preview)
- Database fingerprint should be **different** from Production

---

## Test 2: User Authentication Check

### Production

1. Sign in to: `https://heirvault.app`
2. Visit: `https://heirvault.app/api/debug/whoami`
3. Verify the response shows:

```json
{
  "authenticated": true,
  "clerkUserId": "user_...",
  "email": "your-email@example.com",
  "dbUserFound": true,
  "dbUserId": "...",
  "role": "ADMIN",  // or "attorney"
  "roles": ["ADMIN"],
  "isAdmin": true  // if you're an admin
}
```

**✅ Pass Criteria:**
- `authenticated: true`
- `dbUserFound: true` (user exists in database)
- `email` matches your Clerk email
- `isAdmin: true` if you're an admin user

### Preview

1. Sign in to preview deployment
2. Visit: `https://[preview-url].vercel.app/api/debug/whoami`
3. Verify same criteria as Production

**Note:** If `dbUserFound: false`, you need to create the user in the staging database.

---

## Test 3: Database Connection Test

### Test Production Database

1. Visit: `https://heirvault.app/api/debug/env-health`
2. Note the `database.dbFingerprint` value
3. Compare with your Supabase Production project hostname
4. They should match

**Example:**
- Supabase Production host: `db.abcdefghijklmnop.supabase.co`
- Fingerprint should show: `db.abcdefghijklmnop...`

### Test Staging Database

1. Visit preview deployment: `https://[preview-url].vercel.app/api/debug/env-health`
2. Note the `database.dbFingerprint` value
3. Compare with your Supabase Staging project hostname
4. They should match and be **different** from Production

**✅ Pass Criteria:**
- Production fingerprint matches Production Supabase project
- Staging fingerprint matches Staging Supabase project
- Fingerprints are different between environments

---

## Test 4: Billing Feature Flag

### Production (Should be Disabled)

1. Visit: `https://heirvault.app/dashboard/billing`
2. Should see: "Billing is being activated for early firms. Contact us to enable."
3. Should **NOT** see Stripe checkout buttons or pricing

**✅ Pass Criteria:**
- Billing page shows disabled message
- No checkout functionality visible

### Preview (Should be Enabled)

1. Visit: `https://[preview-url].vercel.app/dashboard/billing`
2. Should see full billing page with:
   - Subscription status
   - Pricing information
   - Checkout buttons (using test Stripe keys)

**✅ Pass Criteria:**
- Billing page shows full functionality
- Checkout buttons are visible
- Uses test Stripe keys (verify in Stripe dashboard)

---

## Test 5: Billing API Protection

### Production (Should Block)

1. Try to access: `POST https://heirvault.app/api/billing/checkout`
2. Should return: `404 Not available` or error message

**✅ Pass Criteria:**
- Checkout endpoint returns 404 or error
- Cannot create checkout sessions in Production

### Preview (Should Allow)

1. Sign in to preview deployment
2. Try to access: `POST https://[preview-url].vercel.app/api/billing/checkout`
3. Should return checkout session URL (or redirect to Stripe)

**✅ Pass Criteria:**
- Checkout endpoint works
- Returns Stripe checkout URL
- Uses test Stripe keys

---

## Test 6: Database Isolation

### Verify Production Data Stays Separate

1. Create a test record in Production (if applicable)
2. Check preview deployment
3. Verify the test record does **NOT** appear in preview

**✅ Pass Criteria:**
- Production data is isolated
- Staging data is isolated
- No data leakage between environments

---

## Test 7: Clerk Authentication

### Test Sign-In Flow

1. **Production:**
   - Visit: `https://heirvault.app/sign-in`
   - Sign in with your account
   - Should redirect to dashboard

2. **Preview:**
   - Visit: `https://[preview-url].vercel.app/sign-in`
   - Sign in with same account
   - Should redirect to dashboard

**✅ Pass Criteria:**
- Sign-in works in both environments
- No "authorization_invalid" errors
- Preview domains are allowed in Clerk dashboard

**If you get authorization errors:**
- Go to Clerk Dashboard → Settings → Allowed Origins
- Add: `https://*.vercel.app` or your specific preview URL

---

## Test 8: Prisma Accelerate

### Verify Accelerate is Working

1. Visit: `https://heirvault.app/api/debug/env-health`
2. Check: `database.accelerateUrlValid: true`
3. Check: `database.accelerateUrlConfigured: true`

**✅ Pass Criteria:**
- Accelerate URL is configured
- Accelerate URL format is valid (starts with `prisma://`)
- No connection errors in logs

---

## Test 9: Migration Status

### Check Both Databases

**Production:**
```bash
# Set Production connection strings in .env.local
DATABASE_URL="[Production pooled]"
DIRECT_URL="[Production direct]"

# Check migration status
npx prisma migrate status
```

**Staging:**
```bash
# Set Staging connection strings in .env.local
DATABASE_URL="[Staging pooled]"
DIRECT_URL="[Staging direct]"

# Check migration status
npx prisma migrate status
```

**✅ Pass Criteria:**
- Both databases show: "Database schema is up to date!"
- No pending migrations
- All migrations applied successfully

---

## Test 10: End-to-End Billing Flow (Preview Only)

### Test Complete Billing Flow

1. Sign in to preview deployment
2. Navigate to `/dashboard/billing`
3. Click "Subscribe" or checkout button
4. Complete Stripe test checkout:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
5. Verify webhook processes the subscription
6. Check that subscription status updates

**✅ Pass Criteria:**
- Checkout flow works
- Test payment succeeds
- Webhook processes event
- Subscription status updates in database

---

## Troubleshooting Test Failures

### Database Connection Issues

**Symptom:** `database.urlConfigured: false` or connection errors

**Solutions:**
1. Verify connection strings in Vercel
2. Check Supabase project is active
3. Verify IP allowlist (if enabled)
4. Test connection strings locally

### Accelerate URL Invalid

**Symptom:** `accelerateUrlValid: false`

**Solutions:**
1. Verify URL starts with `prisma://`
2. Check Accelerate project is active
3. Verify Accelerate project is linked to correct database
4. Regenerate Accelerate URL if needed

### Billing Flag Not Working

**Symptom:** Billing enabled in Production or disabled in Preview

**Solutions:**
1. Check `BILLING_ENABLED` in Vercel environment variables
2. Verify it's set for correct environment (Production vs Preview)
3. Redeploy after changing environment variables

### User Not Found

**Symptom:** `dbUserFound: false` in whoami endpoint

**Solutions:**
1. Verify user exists in correct database
2. Check `clerkId` matches Clerk user ID
3. Create user in staging database if testing preview
4. Run user creation/bootstrap script

---

## Test Checklist

Use this checklist to verify everything:

### Production Environment
- [ ] `/api/debug/env-health` returns all `true` values
- [ ] `database.urlsMatch: true`
- [ ] `billing.enabled: false`
- [ ] `security.hasPublicClerkSecret: false`
- [ ] `/api/debug/whoami` shows authenticated user
- [ ] Database fingerprint matches Production Supabase
- [ ] Billing page shows disabled message
- [ ] Checkout endpoint returns 404

### Preview Environment
- [ ] `/api/debug/env-health` returns all `true` values
- [ ] `database.urlsMatch: true`
- [ ] `billing.enabled: true`
- [ ] `stripe.mode: "test"`
- [ ] `/api/debug/whoami` shows authenticated user
- [ ] Database fingerprint matches Staging Supabase
- [ ] Database fingerprint different from Production
- [ ] Billing page shows full functionality
- [ ] Checkout endpoint works
- [ ] Test payment flow completes successfully

### Both Environments
- [ ] Sign-in works
- [ ] No authorization errors
- [ ] Migrations applied successfully
- [ ] Data isolation verified

---

## Quick Test Script

You can use this curl command to quickly test endpoints:

```bash
# Test Production
curl https://heirvault.app/api/debug/env-health | jq

# Test Production (authenticated)
curl -H "Cookie: [your-session-cookie]" https://heirvault.app/api/debug/whoami | jq

# Test Preview (replace with your preview URL)
curl https://[preview-url].vercel.app/api/debug/env-health | jq
```

---

## Success Criteria

Your setup is working correctly when:

✅ All health checks pass  
✅ Database connections work in both environments  
✅ Billing is disabled in Production, enabled in Preview  
✅ User authentication works in both environments  
✅ Data is isolated between environments  
✅ Stripe test mode works in Preview  
✅ All security checks pass  

If all tests pass, your environment is properly configured and ready for development!

