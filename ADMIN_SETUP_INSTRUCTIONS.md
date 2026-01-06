# Admin Setup for robertkellydc@gmail.com

## Quick Setup

To ensure `robertkellydc@gmail.com` is set as an admin, you need to:

> **Note**: For Google sign-in setup, see `GOOGLE_SIGNIN_SETUP.md`

### 1. Add to Environment Variable

Add this to your `.env.local` file:

```env
ADMIN_EMAILS=robertkellydc@gmail.com
```

Or if you already have other admins:

```env
ADMIN_EMAILS=robertkellydc@gmail.com,other-admin@example.com
```

### 2. Restart Dev Server

After updating `.env.local`, restart your development server:

```bash
npm run dev
```

### 3. Sign In

The admin role will be automatically assigned when the user signs in with `robertkellydc@gmail.com`.

## Verify Admin Status

1. **Sign in** with `robertkellydc@gmail.com`
2. **Check browser console** for:
   ```
   [AUDIT] Admin user bootstrapped: robertkellydc@gmail.com
   ```
3. **Visit** `/admin` - should show admin dashboard
4. **Check** `/api/debug/whoami` - should show `"isAdmin": true`

## Manual Database Update (Optional)

If you want to set the admin role immediately without waiting for sign-in, you can run:

```sql
UPDATE users 
SET roles = ARRAY['USER', 'ADMIN'] 
WHERE LOWER(email) = 'robertkellydc@gmail.com';
```

## Notes

- The system checks `ADMIN_EMAILS` on every sign-in
- Admin role persists in the database once assigned
- If email is removed from `ADMIN_EMAILS`, the role will be removed on next sign-in
- Email matching is case-insensitive
