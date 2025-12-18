# Clerk Redirect Configuration Guide

Based on the [Clerk documentation](https://clerk.com/docs/nextjs/guides/development/custom-sign-up-page), you need to configure environment variables to properly handle redirects and prevent malformed URLs.

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Clerk Redirect URLs
# These tell Clerk where your custom auth pages are located
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/attorney/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/attorney/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/attorney/sign-in/complete
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/attorney/sign-up/complete
```

## What These Do

- **`NEXT_PUBLIC_CLERK_SIGN_IN_URL`**: Tells Clerk where your custom sign-in page is located
- **`NEXT_PUBLIC_CLERK_SIGN_UP_URL`**: Tells Clerk where your custom sign-up page is located
- **`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`**: Fallback URL if users visit the sign-in route directly
- **`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`**: Fallback URL if users visit the sign-up route directly

## Why This Fixes the Malformed URL Issue

The malformed URL `localhost:3002?attorney/dashboard` happens when Clerk doesn't know where your custom auth pages are. By setting these environment variables, Clerk will:

1. Use the correct paths for redirects
2. Avoid creating query parameters instead of paths
3. Properly handle fallback redirects

## After Adding These Variables

1. **Restart your dev server** (the environment variables are loaded at startup)
2. **Clear your browser cache/cookies** for localhost:3002
3. **Try accessing the dashboard again**

The middleware I added will also catch and fix any malformed URLs automatically, but setting these environment variables prevents them from happening in the first place.

