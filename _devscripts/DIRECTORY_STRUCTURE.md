# Directory Structure

**LOCKED** - This structure is established and should not be deviated from. Cursor works best when the tree is stable.

## App Directory Structure

```
/app
  /(public)                    # Public routes - no authentication required
    /page.tsx                  → Landing Page
    /intake/page.tsx           → Policy Intake
    /update/[token]/page.tsx   → QR Re-submission

  /(auth)                      # Authentication routes
    /login/page.tsx            → Attorney Auth

  /(protected)                 # Protected routes - requires authentication
    /dashboard/page.tsx        → Attorney Dashboard
    /records/page.tsx          → Registry Records List
    /records/[id]/page.tsx    → Registry Record Detail
    /search/page.tsx           → Search Page
    /audit/page.tsx            → Audit Trail
    /admin/page.tsx            → Administration

  /api                         # API Routes
    /intake/route.ts           → Policy Intake API
    /documents/route.ts        → Documents API
    /records/route.ts          → Registry Records API
    /access/route.ts           → Access Control API
    /search/route.ts           → Search API
```

## Library Structure

```
/lib
  /auth.ts                     → Authentication utilities
  /roles.ts                    → Roles and permissions definitions
  /db.ts                       → Database connection and utilities
  /storage.ts                  → File storage utilities
  /qr.ts                       → QR code generation and validation
  /hash.ts                     → Cryptographic hashing
  /permissions.ts              → Permission checks and access control
  /extract.ts                  → Document extraction and OCR
```

## Components Structure

```
/components
  /forms                       → Form components
  /cards                       → Card components
  /tables                      → Table components
  /modals                      → Modal components
```

## Root Files

```
/middleware.ts                 → Application middleware
```

## Route Groups

### (public)
- No authentication required
- Accessible to anyone
- Landing, intake, and update pages

### (auth)
- Authentication flows
- Login, sign-up, password reset

### (protected)
- Requires authentication
- Attorney-only access
- Dashboard, records, search, audit, admin

## Migration Notes

This structure is established. Existing files should be migrated to match this structure:

1. **Public Routes**: Move from root `/app` to `/(public)`
2. **Protected Routes**: Move from `/dashboard` to `/(protected)`
3. **API Routes**: Consolidate and organize under `/api`
4. **Library Files**: Organize utilities into specified files
5. **Components**: Organize by type (forms, cards, tables, modals)

## Stability

**DO NOT DEVIATE** from this structure. Cursor works best when the directory tree is stable and predictable.

