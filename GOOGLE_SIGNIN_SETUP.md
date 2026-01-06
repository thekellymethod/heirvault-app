# Enable Google Sign-In for Admin (robertkellydc@gmail.com)

## Overview

Google OAuth sign-in is configured in the **Clerk Dashboard**, not in code. The application code already supports Google sign-in - you just need to enable it in Clerk.

## Steps to Enable Google Sign-In

### 1. Go to Clerk Dashboard

1. Visit: https://dashboard.clerk.com
2. Sign in to your Clerk account
3. Select your HeirVault application

### 2. Enable Google OAuth Provider

1. Navigate to: **User & Authentication** → **Social Connections**
2. Find **Google** in the list of providers
3. Click **Enable** or toggle it **ON**
4. Configure Google OAuth:
   - **Client ID**: You'll need to create a Google OAuth app (see below)
   - **Client Secret**: From your Google OAuth app
   - **Scopes**: Default scopes are usually sufficient (email, profile)

### 3. Create Google OAuth Application (if needed)

If you don't have a Google OAuth app yet:

1. Go to: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Navigate to: **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: HeirVault (or your preferred name)
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for development)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs**:
     - Clerk will provide this - look for it in the Clerk Dashboard under Google OAuth settings
     - Usually something like: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
6. Copy the **Client ID** and **Client Secret**
7. Paste them into Clerk Dashboard

### 4. Configure Admin Email

Make sure `robertkellydc@gmail.com` is in your admin list:

**In `.env.local`:**
```env
ADMIN_EMAILS=robertkellydc@gmail.com
```

### 5. Test Google Sign-In

1. Restart your dev server (if running)
2. Go to: `http://localhost:3000/sign-in`
3. You should see a **"Continue with Google"** button
4. Click it and sign in with `robertkellydc@gmail.com`
5. The system will:
   - Create/update the user account
   - Assign ADMIN role (because email matches `ADMIN_EMAILS`)
   - Redirect to dashboard

## How It Works

1. **User clicks "Continue with Google"** → Redirected to Google OAuth
2. **User signs in with Google** → Google redirects back to Clerk
3. **Clerk creates/updates user** → Provides user data to your app
4. **Your app checks email** → If matches `ADMIN_EMAILS`, assigns ADMIN role
5. **User redirected to dashboard** → With admin privileges

## Account Linking

The code handles account linking intelligently:
- If user signs in with Google using `robertkellydc@gmail.com`
- And that email already exists in the database
- The accounts will be linked automatically
- Admin role will be assigned if email is in `ADMIN_EMAILS`

## Troubleshooting

### Google Sign-In Button Not Showing

- **Check**: Clerk Dashboard → Social Connections → Google is enabled
- **Check**: Google OAuth credentials are correctly configured
- **Check**: Authorized redirect URIs include Clerk's callback URL

### Admin Role Not Assigned

- **Check**: `.env.local` has `ADMIN_EMAILS=robertkellydc@gmail.com`
- **Check**: Email matches exactly (case-insensitive)
- **Check**: Restart dev server after changing env vars
- **Check**: Browser console for audit logs:
  ```
  [AUDIT] Admin user bootstrapped: robertkellydc@gmail.com
  ```

### "Account Already Exists" Error

- This happens if the email is associated with a different Clerk account
- Solution: Use the original sign-in method, or contact support to link accounts

## Production Setup

For production, make sure to:

1. **Add production domain** to Google OAuth authorized origins
2. **Update Clerk redirect URIs** for production domain
3. **Set `ADMIN_EMAILS`** in production environment variables (Vercel, etc.)
4. **Test** Google sign-in on production domain

## Security Notes

- Google OAuth is secure and recommended for admin access
- Email verification is handled by Google
- Admin role assignment is based on `ADMIN_EMAILS` env var (server-side check)
- Account linking prevents unauthorized access
