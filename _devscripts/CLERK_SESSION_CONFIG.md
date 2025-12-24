# Clerk Session Configuration Guide

## Session Timeout Configuration

To configure session timeout and ensure users are required to sign in after extended periods of inactivity, you need to configure this in your **Clerk Dashboard**, not in code.

### Steps to Configure Session Timeout:

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com
2. **Navigate to**: Your Application → Sessions
3. **Configure Session Settings**:
   - **Session Lifetime**: Set to your desired timeout (e.g., 7 days, 30 days, etc.)
   - **Inactive Session Timeout**: Set to a shorter period (e.g., 24 hours, 48 hours) - this is the "extended period of time" after which users must sign in again
   - **Session Token Lifetime**: Controls how long the session token is valid

### Recommended Settings:

- **Session Lifetime**: 30 days (users stay signed in for 30 days)
- **Inactive Session Timeout**: 7 days (if inactive for 7 days, require sign-in)
- **Session Token Lifetime**: 1 hour (tokens refresh automatically)

## How It Works

1. **New Browser Session**: 
   - User visits the landing page (`/`)
   - Landing page is always public and loads first
   - When user tries to access protected routes (like `/dashboard`), they're redirected to sign-in if not authenticated

2. **After Extended Inactivity**:
   - Clerk automatically invalidates expired sessions
   - When user tries to access protected routes, middleware detects expired session
   - User is redirected to the landing page or sign-in page

3. **Landing Page Always Loads First**:
   - The root route (`/`) is marked as public in middleware
   - It always loads without authentication
   - Users can browse the landing page, then click "Sign In" when ready

## Current Configuration

- ✅ Landing page (`/`) is public and always accessible
- ✅ Protected routes require authentication
- ✅ Expired sessions redirect to landing page
- ✅ New sessions require sign-in for protected routes

## Testing

1. **New Session Test**:
   - Open an incognito/private browser window
   - Visit `http://localhost:3000` - should see landing page
   - Try to access `/dashboard` - should redirect to sign-in

2. **Session Expiration Test**:
   - Sign in and access dashboard
   - Wait for session to expire (or manually expire in Clerk Dashboard)
   - Try to access `/dashboard` - should redirect to landing page or sign-in

