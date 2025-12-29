# Testing Start Here 🚀

Quick guide to begin testing your setup right now.

## Step 1: Test Production Environment Health

Open your browser and visit:

```
https://heirvault.app/api/debug/env-health
```

**What to look for:**

✅ **Must be true:**
- `database.urlConfigured: true`
- `database.directUrlConfigured: true`
- `database.accelerateUrlConfigured: true`
- `database.accelerateUrlValid: true`
- `database.urlsMatch: true`
- `clerk.configured: true`
- `security.hasPublicClerkSecret: false` ⚠️ **CRITICAL**

✅ **Should be:**
- `billing.enabled: false` (Production should have billing disabled)
- `stripe.mode: "live"` (or "test" if not ready for payments)

**Copy the response and check each field above.**

---

## Step 2: Test Your User Authentication

1. Make sure you're signed in to: `https://heirvault.app`
2. Visit: `https://heirvault.app/api/debug/whoami`

**What to look for:**

✅ **Must be true:**
- `authenticated: true`
- `dbUserFound: true`
- `email` matches your email address

✅ **If you're an admin:**
- `role: "ADMIN"`
- `isAdmin: true`

**If `dbUserFound: false`, your user doesn't exist in the database yet.**

---

## Step 3: Test Billing Page (Production)

Visit: `https://heirvault.app/dashboard/billing`

**What you should see:**
- Message: "Billing is being activated for early firms. Contact us to enable."
- **NO** checkout buttons
- **NO** Stripe payment forms

✅ **This confirms billing is properly disabled in Production.**

---

## Step 4: Test Preview Environment (If Available)

If you have a preview deployment:

1. Get your preview URL (from Vercel dashboard or git branch)
2. Visit: `https://[preview-url].vercel.app/api/debug/env-health`

**What to look for:**

✅ **Should be different from Production:**
- `database.dbFingerprint` should be different (staging database)
- `billing.enabled: true` (Preview should have billing enabled)
- `stripe.mode: "test"` (Preview should use test keys)

---

## Quick Status Check

After running the tests above, answer these:

### Production Status
- [ ] Environment health check passes
- [ ] User authentication works (`dbUserFound: true`)
- [ ] Billing is disabled (shows "Contact us" message)
- [ ] Database connection works
- [ ] No security issues (`hasPublicClerkSecret: false`)

### Preview Status (if available)
- [ ] Environment health check passes
- [ ] Database fingerprint is different from Production
- [ ] Billing is enabled
- [ ] Stripe is in test mode

---

## If Something Fails

### Database Connection Issues
- Check Vercel environment variables are set
- Verify Supabase project is active
- Check connection strings are correct

### User Not Found
- User may not exist in database
- Check `clerkId` matches between Clerk and database
- May need to create user or run bootstrap script

### Billing Flag Wrong
- Check `BILLING_ENABLED` in Vercel environment variables
- Verify it's set for correct environment
- Redeploy after changing variables

### Security Issue
- If `hasPublicClerkSecret: true`, this is CRITICAL
- Remove `NEXT_PUBLIC_CLERK_SECRET_KEY` immediately
- Never expose secret keys in client-side code

---

## Next Steps

Once basic tests pass:

1. ✅ Continue with full test suite: `docs/TEST_SETUP.md`
2. ✅ Set up staging database if not done: `docs/SUPABASE_SETUP.md`
3. ✅ Configure preview environment variables
4. ✅ Test end-to-end billing flow in preview

---

## Need Help?

- See detailed test guide: `docs/TEST_SETUP.md`
- Troubleshooting: Check the troubleshooting section in each test
- Environment setup: `docs/ENVIRONMENT_SETUP.md`

**Start with Step 1 above and report back what you see!**

