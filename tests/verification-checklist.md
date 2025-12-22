# Security Verification Checklist

This checklist verifies that all security measures are correctly implemented and cannot be bypassed.

## ✅ Permission Functions

- [ ] `listAuthorizedRegistries()` only returns registries from `registry_permissions` table
- [ ] `requireAccessRegistry()` throws 403 (not 404) for unauthorized access
- [ ] `canAccessRegistry()` correctly checks ADMIN, ATTORNEY, and SYSTEM roles
- [ ] Unknown roles are denied access (fail secure)

## ✅ Clerk Roles

- [ ] `isAdmin()` checks `ADMIN_EMAILS` environment variable
- [ ] `requireAdmin()` uses `isAdmin()` (not Clerk metadata)
- [ ] `requireAttorney()` enforces attorney role
- [ ] Email matching is case-insensitive
- [ ] Empty `ADMIN_EMAILS` results in no admins

## ✅ API Routes

- [ ] `/api/policies` checks `assertAttorneyCanAccessClient()`
- [ ] `/api/beneficiaries` requires authentication
- [ ] `/api/search` uses `listAuthorizedRegistries()` to filter results
- [ ] `/api/records` checks `requireAccessRegistry()`
- [ ] All protected routes return 401 for unauthenticated users
- [ ] All protected routes return 403 for unauthorized users

## ✅ Database Security

- [ ] `registry_permissions` table has unique constraint on `(registry_id, user_id)`
- [ ] `attorneyClientAccess` table has unique constraint on `(attorney_id, client_id)`
- [ ] RLS is enabled on `registry_records`, `registry_versions`, `registry_permissions`
- [ ] `access_logs` table is append-only (no UPDATE/DELETE)
- [ ] `user_has_registry_permission()` function exists and works correctly

## ✅ Search Security

- [ ] Search only queries `listAuthorizedRegistries()` results
- [ ] Search cannot leak data from unauthorized registries
- [ ] Search results are redacted (no full policy numbers)
- [ ] Search requires valid purpose parameter

## ✅ UI Security

- [ ] Dashboard only shows authorized registries
- [ ] Record detail pages check `requireAccessRegistry()`
- [ ] Unauthorized access shows 403 error (not 404)
- [ ] Search UI only shows authorized results

## ✅ RLS Policies

- [ ] RLS policies exist for all registry tables
- [ ] RLS policies use `user_has_registry_permission()` function
- [ ] RLS policies are permissive (TRUE) as safety net (server enforces)
- [ ] RLS policies documented with TODOs for future Supabase Auth integration

## Manual Testing Steps

1. **Create two test users**: User A and User B
2. **Grant User A access to Registry 1**
3. **Grant User B access to Registry 2**
4. **As User A**:
   - Access `/records/registry1` → Should work (200)
   - Access `/records/registry2` → Should fail (403)
   - Search for "registry2 data" → Should return zero results
5. **As Admin**:
   - Access `/records/registry1` → Should work (200)
   - Access `/records/registry2` → Should work (200)
   - Search → Should return all results

## Automated Test Coverage

Run all tests to verify:

```bash
# Unit tests
npm test

# Integration tests
npm test -- tests/integration

# E2E tests
npm run test:e2e

# Security tests
npm test -- tests/api-security.test.ts
npm test -- tests/rls-verification.test.ts
npm test -- tests/clerk-roles.test.ts
```

## Known Limitations

1. **RLS Policies**: Currently permissive (TRUE) because we use Clerk, not Supabase Auth. Server-side enforcement is primary.
2. **E2E Tests**: Require test authentication setup (Clerk test mode or mocks).
3. **Integration Tests**: Require test database with same schema as production.

## Future Improvements

- [ ] Add Supabase Auth integration for RLS enforcement
- [ ] Add automated RLS policy testing
- [ ] Add performance tests for permission queries
- [ ] Add load tests for concurrent access

