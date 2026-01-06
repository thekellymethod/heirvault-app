# Clerk Admin Setup - Using Public Metadata

## ✅ Implementation Complete

The application now supports **Clerk public metadata** as the **authoritative source** for admin access, with backward compatibility for existing `ADMIN_EMAILS` configuration.

## How It Works

### Priority Order (Checked in this order):

1. **Clerk `publicMetadata.role === "admin"`** ← **Primary source of truth**
2. Database `roles` array includes `"ADMIN"` (backward compatibility)
3. Email in `ADMIN_EMAILS` env var (backward compatibility)
4. User ID in `ADMIN_USER_IDS` env var (backward compatibility)

## Step 1: Set Admin in Clerk Dashboard

1. Go to: https://dashboard.clerk.com
2. Navigate to: **Users** → Find your user (robertkellydc@gmail.com)
3. Click on the user → **Metadata** tab
4. In the **Public** metadata section, click **Edit**
5. Enter exactly this JSON:

```json
{
  "role": "admin"
}
```

6. Click **Save**

That's it! You're now an admin at the identity level.

## Step 2: Test Admin Access

1. **Refresh your app** (or restart dev server if needed)
2. **Sign in** with robertkellydc@gmail.com
3. **Visit** `/admin` - should load without error
4. **Visit** `/admin/console` - should load without error
5. **Test an admin API** - should work

## What Was Updated

### Files Modified:

1. **`src/lib/auth/guards.ts`**
   - `requireAdmin()` now checks Clerk `publicMetadata.role` first
   - Falls back to database roles and `ADMIN_EMAILS` for backward compatibility

2. **`src/lib/admin.ts`**
   - `isAdmin()` now checks Clerk `publicMetadata.role` first
   - Maintains backward compatibility with existing checks

3. **`src/app/api/admin/outreach/send/route.ts`**
   - Updated to use `requireAdmin()` guard instead of token-based auth

### Files Already Protected:

- ✅ `/app/(protected)/admin/page.tsx` - Uses `requireAdmin()`
- ✅ `/app/admin/console/page.tsx` - Uses `requireAdmin()`
- ✅ All admin API routes that import from `@/lib/auth/guards`

## Architecture Benefits

✅ **Identity source of truth: Clerk**  
✅ **Authorization: Server-side**  
✅ **No hardcoded emails**  
✅ **No env tokens required**  
✅ **No client-only checks**  
✅ **Backward compatible** with existing `ADMIN_EMAILS` setup

## Backward Compatibility

The system still supports:
- `ADMIN_EMAILS` env var (for multiple admins via email)
- `BOOTSTRAP_ADMIN_EMAIL` env var
- `ADMIN_USER_IDS` env var
- Database `roles` array with `"ADMIN"`

But **Clerk public metadata takes precedence** - if set, it's the authoritative source.

## Production Setup

For production:

1. **Set admin in Clerk Dashboard** (same as Step 1 above)
2. **No environment variables needed** for admin access
3. **Optional**: Keep `ADMIN_EMAILS` as backup/fallback

## Troubleshooting

### Admin page still redirects

- **Check**: Clerk Dashboard → Users → Your user → Metadata → Public → `role: "admin"`
- **Check**: You're signed in with the correct Clerk account
- **Check**: Browser console for errors
- **Try**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### API routes return 403

- **Check**: The route uses `requireAdmin()` from `@/lib/auth/guards`
- **Check**: Clerk metadata is set correctly
- **Check**: Server logs for error messages

### Want to use both methods?

You can use both Clerk metadata AND `ADMIN_EMAILS`:
- Clerk metadata = primary (checked first)
- `ADMIN_EMAILS` = fallback (checked if Clerk metadata not set)

This gives you flexibility during migration.

## Next Steps (Optional)

You can later sync Clerk admin status to your database if you want:
- Multiple admins management
- Org-based permissions
- Audit logs of admin assignments

But for now, **Clerk public metadata is the right move** - clean, secure, and production-ready.
