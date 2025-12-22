# Prisma Migration Fix Instructions

## STEP 0 — Safety: Confirm dev DB
⚠️ **IMPORTANT**: Confirm `DATABASE_URL` points to a dev database (not production).
If uncertain, assume dev and proceed only if data loss is acceptable.

## STEP 1 — Fix schema.prisma datasource ✅
- ✅ Updated `prisma/schema.prisma` to include `url = env("DATABASE_URL")`

## STEP 2 — Attempt a clean dev reset first

Run these commands in order:

```bash
# Reset the database and apply all migrations from scratch
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Generate Prisma client for Accelerate (no engine)
npx prisma generate --no-engine
```

If `migrate status` shows "up to date", proceed to STEP 5.

## STEP 3 — If reset fails (squash migrations - dev-only)

If reset fails due to migration ordering issues, squash migrations:

```bash
# Create backup of existing migrations
mv prisma/migrations prisma/migrations_backup_$(date +%Y%m%d_%H%M%S)

# Create fresh baseline migration
npx prisma migrate dev --name init

# Generate client for Accelerate
npx prisma generate --no-engine

# Verify
npx prisma migrate status
```

## STEP 4 — Prisma client for Vercel + Accelerate ✅
- ✅ `src/lib/prisma.ts` is already configured with Accelerate extension
- Ensure env vars exist:
  - `DATABASE_URL=...` (PostgreSQL connection string)
  - `PRISMA_ACCELERATE_URL=prisma://...` (Accelerate connection string)
  - `BOOTSTRAP_ADMIN_EMAIL=admin@heirvault.app` (or your admin email)

## STEP 5 — Fix user creation roles ✅
- ✅ Updated `src/lib/auth/CurrentUser.ts`:
  - New users created with `roles: ["USER"]` (NOT `["USER","ATTORNEY"]`)
  - If email matches `BOOTSTRAP_ADMIN_EMAIL`, adds `"ADMIN"` role
  - Logs admin bootstrap to console

## STEP 6 — Guards ✅
- ✅ `src/lib/auth/guards.ts` implements:
  - `requireAuth()` - Basic authentication
  - `requireAdmin()` - Admin-only access
  - `requireVerifiedAttorney()` - Verified attorney access
    - Admin bypass (admin can access attorney pages without AttorneyProfile)
    - Non-admin must have ATTORNEY role
    - Requires AttorneyProfile.verifiedAt not null AND licenseStatus === "ACTIVE"

## STEP 7 — Route runtimes (Node) ✅
- ✅ Key API routes have `export const runtime = "nodejs";`:
  - `/api/clients`
  - `/api/search/global`
  - `/api/policy-locator/search`
  - `/api/search`
  - `/api/attorney/apply`
  - `/api/admin/attorneys/verify`

## STEP 8 — Attorney onboarding routes ✅
- ✅ `/api/attorney/apply` (POST):
  - Creates/updates AttorneyProfile as PENDING (verifiedAt null)
  - Adds ATTORNEY role to user
- ✅ `/api/admin/attorneys/verify` (POST/GET):
  - Admin-only (uses `requireAdmin()`)
  - Sets AttorneyProfile licenseStatus ACTIVE + verifiedAt = now
  - Adds "ATTORNEY" role to target user
  - Writes audit log

## STEP 9 — Supabase registry permissions bridge ✅
- ✅ `listAuthorizedRegistries()` calls use `user.clerkId` (not `user.id`)
- ✅ Updated in:
  - `src/app/(protected)/records/page.tsx`
  - `src/app/api/search/route.ts`
  - `src/lib/permissions.ts`

## Final Verification Checklist

Run these to verify everything works:

```bash
# 1. Check migration status
npx prisma migrate status
# Should show: "Database schema is up to date"

# 2. Generate Prisma client
npx prisma generate --no-engine
# Should succeed without errors

# 3. Test admin bootstrap
# Sign in with Clerk using admin@heirvault.app
# Check database: User.roles should contain "ADMIN"

# 4. Test attorney verification
# - Non-admin users cannot access attorney pages (should get 403)
# - Admin can access attorney pages even without AttorneyProfile
# - Verified attorneys can access attorney pages
```

## Notes

- The Prisma schema now includes:
  - `User.roles` field (String[])
  - `attorneyProfile` model with `licenseStatus` and `verifiedAt`
  - `LicenseStatus` enum (PENDING, ACTIVE, SUSPENDED, REVOKED)

- Admin users bypass attorney verification checks
- New users are created with `["USER"]` role only
- Admin email is bootstrapped automatically on first login

