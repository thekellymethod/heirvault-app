# Clerk.js Loading Issues - Troubleshooting Guide

## Common Error: "Failed to load Clerk"

### Error Messages
- `ClerkRuntimeError: Clerk: Failed to load Clerk`
- `failed_to_load_clerk_js`
- `failed_to_load_clerk_js_timeout`

## Root Causes & Solutions

### 1. Content Security Policy (CSP) Blocking Clerk

**Problem:** CSP headers are blocking Clerk's CDN scripts.

**Solution:** Ensure `next.config.mjs` includes Clerk domains in CSP:

```javascript
const scriptSrc = "'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com";

const csp = [
  `script-src ${scriptSrc}`,
  `style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com`,
  `connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com ...`,
  `frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com`,
  `child-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com`,
  // ... other directives
];
```

**Status:** ✅ Fixed in `next.config.mjs`

### 2. Missing Environment Variables

**Required Variables:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... or pk_live_...
CLERK_SECRET_KEY=sk_test_... or sk_live_...
```

**Check:**
1. Verify variables are set in `.env.local` (local dev)
2. Verify variables are set in Vercel (production/preview)
3. Restart dev server after adding variables

### 3. Incorrect Clerk Domain

**Problem:** Clerk domain mismatch or incorrect configuration.

**Solution:**
1. Check Clerk Dashboard → Settings → Domains
2. Verify publishable key matches your Clerk instance
3. Ensure domain is allowed in Clerk settings

### 4. Network/Firewall Issues

**Problem:** Network blocking Clerk CDN.

**Solutions:**
- Check firewall settings
- Try different network (mobile hotspot)
- Check browser console for blocked requests
- Verify DNS resolution for `*.clerk.accounts.dev`

### 5. ClerkProvider Configuration

**Ensure ClerkProvider has publishable key:**
```tsx
<ClerkProvider 
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
  signInUrl="/sign-in" 
  signUpUrl="/sign-up"
  afterSignInUrl="/dashboard"
  afterSignUpUrl="/dashboard"
>
```

**Status:** ✅ Fixed in `src/app/layout.tsx`

### 6. Browser Cache Issues

**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Try incognito/private mode
4. Clear Clerk cookies

### 7. Development vs Production

**Local Development:**
- Ensure `.env.local` exists with Clerk keys
- Restart dev server after env changes
- Check `localhost` is allowed in Clerk dashboard

**Production:**
- Verify Vercel environment variables
- Check domain is added to Clerk dashboard
- Verify SSL certificate is valid

## Debugging Steps

### Step 1: Check Environment Variables
```bash
# Local
cat .env.local | grep CLERK

# Should show:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
```

### Step 2: Check Browser Console
1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for blocked requests
4. Look for CSP violations

### Step 3: Verify Clerk Script Loading
In browser console:
```javascript
// Check if Clerk is loaded
window.Clerk

// Should return Clerk object, not undefined
```

### Step 4: Check CSP Headers
In browser DevTools → Network tab:
1. Find any request
2. Check Response Headers
3. Look for `Content-Security-Policy`
4. Verify Clerk domains are allowed

### Step 5: Test Clerk Connection
```bash
# Test Clerk API (replace with your key)
curl https://api.clerk.com/v1/me \
  -H "Authorization: Bearer sk_test_..."
```

## Quick Fixes

### Fix 1: Restart Dev Server
```bash
# Stop server (Ctrl+C)
# Then restart
npm run dev
```

### Fix 2: Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Fix 3: Verify Clerk Keys
1. Go to Clerk Dashboard
2. Copy publishable key
3. Verify it matches `.env.local`
4. Ensure key starts with `pk_test_` or `pk_live_`

### Fix 4: Check ClerkProvider
Ensure `publishableKey` prop is set:
```tsx
<ClerkProvider 
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
  // ... other props
>
```

## Prevention

1. **Always set `publishableKey` prop** in ClerkProvider
2. **Keep CSP updated** when adding new services
3. **Test in incognito mode** to avoid cache issues
4. **Verify env vars** before deploying
5. **Monitor Clerk status page** for outages

## Still Not Working?

1. Check Clerk Status: https://status.clerk.com
2. Review Clerk Docs: https://clerk.com/docs
3. Check Clerk Discord: https://clerk.com/discord
4. Verify your Clerk account is active
5. Check for rate limiting on your Clerk instance

---

**Last Updated:** December 2024
