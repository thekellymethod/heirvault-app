# Phase 0 — Hard Gates (Foundation)

## ✅ Implementation Checklist

### 1. Folder Structure ✓
- `/app/(public)` - Public routes (no auth required)
- `/app/(auth)` - Authentication routes
- `/app/(protected)` - Protected routes (require auth)
- `/app/api/*` - API routes
- `/lib/*` - Library functions
- `/components/*` - React components
- `/middleware.ts` - Global gate middleware

### 2. Authentication ✓
**Locked to: Clerk**
- Location: `src/lib/auth.ts`
- Functions:
  - `getUser()` - Get current authenticated user
  - `requireAttorney()` - Require attorney authentication
  - `requireAdmin()` - Require admin authentication
- Middleware: `src/middleware.ts` - Global route protection

### 3. Database Client ✓
- Location: `src/lib/prisma.ts` and `src/lib/db/index.ts`
- Uses: Prisma ORM with PostgreSQL
- Verified: Can run queries via test route

### 4. Role + Permission Layer ✓
**Location: `src/lib/roles.ts`**
- `Role` enum: `ATTORNEY` (Phase 0)
- `isValidRole()` - Validate role
- `getAllRoles()` - Get all valid roles
- `DEFAULT_ROLE` - Default role for new users

**Location: `src/lib/permissions.ts`**
- `canAccessRegistry(userId, registryId)` - Check registry access
- `canSearch(userId)` - Check search permission
- `canViewAudit(userId)` - Check audit view permission
- `verifyRegistryAccess(registryId)` - Permission guard with redirect

### 5. Audit Logger ✓
**Location: `src/lib/audit.ts`**
- `logAccess(user, registryId, action, metadata?)` - Main audit function
- `logSystemAction(registryId, action, metadata?)` - System actions
- `logUserAction(user, registryId, action, metadata?)` - User actions
- **Rule**: Every route handler must call this

### 6. Storage Layer ✓
**Location: `src/lib/storage.ts`**
- `uploadFile(file)` - Upload document with MIME + size validation
- Returns: Immutable storage path (content-addressed)
- Computes: SHA-256 hash
- Enforces: MIME type whitelist, size limits
- Features: Automatic deduplication via content-addressed paths

### 7. Hashing ✓
**Location: `src/lib/hash.ts`**
- `sha256(buffer)` - Hash a buffer
- `sha256String(data)` - Hash a string
- `sha256Json(data)` - Hash JSON data
- `verifyHash(data, expectedHash)` - Verify hash matches

### 8. QR Token ✓
**Location: `src/lib/qr.ts`**
- `generateQRToken(registryId, versionId?)` - Generate signed token
- `verifyQRToken(token)` - Verify and decode token
- `getRegistryIdFromToken(token)` - Extract registry ID (internal only)
- `generateQRCodeDataURL(registryId, baseUrl)` - Generate QR code image
- **Security**: HMAC-signed tokens, never expose registry IDs directly

### 9. Exit Criteria ✓
**Test Route: `/api/test/foundation`**

This route exercises all Phase 0 components:
1. ✅ Database connection test
2. ✅ Roles enum
3. ✅ Hashing (string and buffer)
4. ✅ QR token generation/verification
5. ✅ Permissions (canAccessRegistry, canSearch, canViewAudit)
6. ✅ Registry creation
7. ✅ File hash computation
8. ✅ Version appending
9. ✅ Audit logging
10. ✅ Verification (registry with versions and logs)

## File Structure

```
src/
├── app/
│   ├── (public)/          # Public routes
│   ├── (auth)/            # Auth routes
│   ├── (protected)/       # Protected routes
│   └── api/               # API routes
│       └── test/
│           └── foundation/ # Test route
├── lib/
│   ├── auth.ts            # Authentication (Clerk)
│   ├── db.ts              # Database client
│   ├── roles.ts           # Role enum
│   ├── permissions.ts     # Permission checks
│   ├── audit.ts           # Audit logger
│   ├── storage.ts         # File storage
│   ├── hash.ts            # Cryptographic hashing
│   └── qr.ts              # QR token generation
├── components/            # React components
└── middleware.ts           # Global route protection
```

## Testing

Run the foundation test:
```bash
curl http://localhost:3000/api/test/foundation
```

Expected response:
```json
{
  "success": true,
  "message": "Foundation test completed successfully",
  "results": {
    "database": { "connected": true },
    "roles": { "defaultRole": "attorney" },
    "hashing": { "match": true },
    "qrToken": { "verified": true },
    "permissions": { "canAccessRegistry": true },
    "registry": { "created": true },
    "version": { "appended": true },
    "audit": { "logged": true },
    "verification": { "versionCount": 2, "accessLogCount": 3 }
  }
}
```

## Next Steps

Phase 0 is complete. You can now:
1. Create registry records
2. Upload files with content-addressed storage
3. Hash documents and data
4. Append immutable versions
5. Write comprehensive audit logs
6. Generate secure QR tokens
7. Check permissions
8. Use role-based access control

All foundation components are locked and ready for Phase 1 implementation.

