# Admin Users Reference

This document lists all admin users for the HeirVault application.

## Current Admin Users

### Keith Kelly (Primary Admin)
- **Clerk User ID**: `user_37D6UnlRcOJXBb4N8owtOL2pEVi`
- **Email**: `robertkellydc@gmail.com`
- **Name**: Keith Kelly
- **Phone**: +19725035204
- **Admin Status**: Set via Clerk public metadata
- **Metadata**: `{ "user.role": "admin" }` ⚠️ (Note: Code expects `{ "role": "admin" }`)

### Robert Kelly
- **Clerk User ID**: `user_37TaMHtSlMrLemKI0e1Q6AtODes`
- **Email**: `thekellymethod@outlook.com`
- **Name**: Robert Kelly
- **Phone**: +19453232153
- **Admin Status**: Not set (regular user)

## Configuration

### Clerk Public Metadata (Primary Method)
Admin access is primarily determined by Clerk's `publicMetadata.role === "admin"`.

**To verify in Clerk Dashboard:**
1. Go to https://dashboard.clerk.com
2. Navigate to Users → Find user
3. Click Metadata tab → Public section
4. Should show: `{ "role": "admin" }` (not `"user.role"`)

### Environment Variables (Backup Method)
For backward compatibility, you can also add admins via environment variables:

```env
# Option 1: By email (recommended)
ADMIN_EMAILS=robertkellydc@gmail.com

# Option 2: By Clerk User ID
ADMIN_USER_IDS=user_37D6UnlRcOJXBb4N8owtOL2pEVi

# Option 3: Bootstrap admin (single admin for initial setup)
BOOTSTRAP_ADMIN_EMAIL=robertkellydc@gmail.com
```

## Priority Order

The system checks admin status in this order:
1. **Clerk `publicMetadata.role === "admin"`** ← Primary source
2. Database `roles` array includes `"ADMIN"`
3. Email in `ADMIN_EMAILS` env var
4. User ID in `ADMIN_USER_IDS` env var

## ⚠️ Potential Issue

The admin user JSON shows:
```json
"public_metadata": { "user.role": "admin" }
```

But the code expects:
```typescript
clerkUser?.publicMetadata?.role === "admin"
```

This suggests the metadata might be stored as `"user.role"` instead of `"role"`. If admin access isn't working, verify the metadata structure in Clerk Dashboard and ensure it's set as `{ "role": "admin" }` (not `{ "user.role": "admin" }`).

## Testing Admin Access

1. Sign in with admin account
2. Visit `/admin` - should load without error
3. Visit `/admin/console` - should load without error
4. Check API endpoint: `/api/debug/whoami` - should show `"isAdmin": true`

## Last Updated
- Created: 2025-01-27
- Admin: Keith Kelly (user_37D6UnlRcOJXBb4N8owtOL2pEVi)
