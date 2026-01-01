# Admin User Setup Guide

## Overview

Admin users in HeirVault are determined by email addresses listed in environment variables. There are two ways to set up admin access:

1. **`ADMIN_EMAILS`** - Comma-separated list of admin emails (recommended)
2. **`BOOTSTRAP_ADMIN_EMAIL`** - Single admin email for initial setup

## Setting Up Admin Access

### Option 1: Using ADMIN_EMAILS (Recommended)

Add to your `.env.local` file:

```env
ADMIN_EMAILS=your-email@example.com,another-admin@example.com
```

**Benefits:**
- Supports multiple admins
- Easy to add/remove admins
- Works for both new and existing users

### Option 2: Using BOOTSTRAP_ADMIN_EMAIL

Add to your `.env.local` file:

```env
BOOTSTRAP_ADMIN_EMAIL=your-email@example.com
```

**Note:** This is mainly for initial setup. For multiple admins, use `ADMIN_EMAILS`.

## How It Works

1. **On Sign-In:**
   - System checks if your email matches `ADMIN_EMAILS` or `BOOTSTRAP_ADMIN_EMAIL`
   - If match found, adds "ADMIN" to your roles array
   - Admin role persists in database

2. **Admin Recognition:**
   - `isAdmin()` function checks `ADMIN_EMAILS` env var
   - `isAdminUser()` function checks if user has "ADMIN" in roles array
   - Both methods are used throughout the app

3. **Role Persistence:**
   - Once assigned, ADMIN role is stored in database
   - Role is checked on every sign-in
   - If email is removed from admin list, role is removed on next sign-in

## Verification

### Check if You're Admin

1. **Sign in** to the application
2. **Check browser console** for audit logs:
   ```
   [AUDIT] Adding ADMIN role to existing user: your-email@example.com
   [AUDIT] Admin user bootstrapped: your-email@example.com
   ```

3. **Visit admin page:** `/admin`
   - Should show admin dashboard (not sign-in form)

4. **Check API endpoint:** `/api/debug/whoami`
   - Should show `"isAdmin": true` in response

### Troubleshooting

#### Admin Role Not Assigned

**Check:**
1. Email matches exactly (case-insensitive)
2. Environment variable is set correctly
3. Restart dev server after changing env vars
4. Check browser console for errors

**Fix:**
```bash
# Verify env var is set
echo $ADMIN_EMAILS  # Linux/Mac
# or check .env.local file

# Restart dev server
npm run dev
```

#### Admin Role Removed

**Cause:** Email removed from `ADMIN_EMAILS` or env var cleared

**Fix:**
1. Re-add email to `ADMIN_EMAILS`
2. Sign in again (role will be re-added)
3. Or manually update database:
   ```sql
   UPDATE users 
   SET roles = array_append(roles, 'ADMIN') 
   WHERE email = 'your-email@example.com';
   ```

## Production Setup

### Vercel Environment Variables

Set in **Production + Preview + Development**:

```
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

**Or:**

```
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
```

### Security Notes

- **Never commit** `.env.local` to git
- **Rotate admin emails** regularly
- **Use separate emails** for different environments
- **Monitor admin access** via audit logs

## Admin Features

Once recognized as admin, you can:

- Access `/admin` dashboard
- Use admin console (`/admin/console`)
- Bypass registry gates
- Access all client data
- Manage API tokens
- View compliance reports

---

**Last Updated:** December 2024
