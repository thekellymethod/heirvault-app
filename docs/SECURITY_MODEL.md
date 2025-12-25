# Security Model: Registry Access Control

## Overview

This document describes the security architecture for registry access control in HeirVault. The system uses a **defense-in-depth** approach with both application-layer and database-layer enforcement.

## Identity Strategy: Clerk + Server-Only Enforcement (Option B)

**Decision**: We use Clerk for authentication and store Clerk user IDs as TEXT in `registry_permissions`.

**Implications**:
- All database access uses **service role key** (server-side only)
- No direct client-side Supabase access to registry tables
- Application layer enforces permissions via `listAuthorizedRegistries()`
- RLS policies provide defense-in-depth (currently permissive, can be tightened)

**Why this approach**:
- Clerk provides robust authentication and user management
- Simpler than mapping Clerk → Supabase Auth
- Server-only access prevents accidental client-side leaks
- RLS can be enhanced later if needed

## Role Definitions

### Role Hierarchy (most to least permissions)

1. **OWNER** (Level 5)
   - Full access: read, write, delete, export, manage permissions
   - Can grant/revoke access to other users
   - Can delete registries

2. **ADMIN** (Level 5)
   - Full access: read, write, delete, export, manage permissions
   - Determined by `ADMIN_EMAILS` environment variable (server-authoritative)
   - Cannot be set via database (prevents privilege escalation)

3. **ATTORNEY** (Level 3)
   - Read + export: can view and export registries
   - Cannot modify registry data
   - Cannot delete registries
   - Cannot manage permissions

4. **EDITOR** (Level 2)
   - Read + write: can view and modify registries
   - Cannot delete registries
   - Cannot manage permissions

5. **VIEWER** (Level 1)
   - Read only: can view registries
   - Cannot modify, export, or delete

6. **SYSTEM** (Level 5)
   - Internal use only
   - Full access for system operations
   - Not assignable to users

### Permission Matrix

| Capability | OWNER | ADMIN | ATTORNEY | EDITOR | VIEWER | SYSTEM |
|------------|-------|-------|----------|--------|--------|--------|
| READ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WRITE | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| DELETE | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| EXPORT | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| MANAGE_PERMISSIONS | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

## Access Control Flow

### 1. Application Layer (Primary Enforcement)

**Entry Point**: `listAuthorizedRegistries(userId)`

This function:
- Queries `registry_permissions` table
- Joins with `registry_records`
- Returns only registries the user has permission to access
- Used by all UI routes and search endpoints

**Key Functions**:
- `canAccessRegistry()`: Checks if user can access a specific registry
- `requireAccessRegistry()`: Throws 403 if user cannot access
- `listAuthorizedRegistries()`: Returns all authorized registries for a user

### 2. Database Layer (Defense-in-Depth)

**RLS Policies**: Enabled on all registry tables but currently permissive (allows all SELECT).

**Why permissive for now**:
- All access goes through server-side service role
- RLS would require Supabase Auth integration or custom session variables
- Can be tightened later if direct table access is needed

**Future Enhancement**: If we add Supabase Auth, RLS policies can use `auth.uid()` to enforce permissions at the database level.

## Admin Access Control

**Critical**: Admin status is **server-authoritative only**.

- Determined by `ADMIN_EMAILS` environment variable
- Checked via `isAdmin()` function in `lib/admin.ts`
- Cannot be set via database (prevents privilege escalation)
- Cannot be inferred from Clerk metadata alone

**Security Properties**:
- ✅ Deterministic (env var is source of truth)
- ✅ Not client-writable
- ✅ Not stored in database
- ✅ Checked on every request

## Error Handling: 403 vs 404

**Decision**: Return **403 (Forbidden)** for unauthorized access.

**Rationale**:
- 403 = Registry exists but user lacks permission
- 404 = Registry does not exist
- Prevents information leakage while being explicit about authorization failures

**Implementation**:
- `requireAccessRegistry()` throws `HttpError(403, "FORBIDDEN", ...)`
- Applied consistently across all routes

**Alternative Considered**: Return 404 to hide registry existence. Rejected because:
- Makes debugging harder
- Less explicit about authorization failures
- Can confuse legitimate users

## Database Schema

### `registry_permissions` Table

```sql
CREATE TABLE registry_permissions (
  id UUID PRIMARY KEY,
  registry_id UUID NOT NULL REFERENCES registry_records(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- Clerk user ID
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'ATTORNEY', 'EDITOR', 'VIEWER', 'SYSTEM')),
  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(registry_id, user_id)
);
```

**Constraints**:
- Unique constraint on `(registry_id, user_id)` prevents duplicates
- Foreign key to `registry_records` with CASCADE delete
- Check constraint validates role values
- Indexes on `user_id`, `registry_id`, and composite `(user_id, registry_id)`

## Security Checklist

### ✅ Implemented

- [x] Application-layer access control via `listAuthorizedRegistries()`
- [x] Unique constraint on `registry_permissions`
- [x] Foreign key constraints
- [x] Performance indexes
- [x] Role definitions and hierarchy
- [x] Admin access via `ADMIN_EMAILS` (server-authoritative)
- [x] Consistent 403 error handling
- [x] Audit logging for all access
- [x] Server-only database access (service role)

### 🔄 Future Enhancements

- [ ] RLS policies with Supabase Auth integration
- [ ] Automated tests for unauthorized access scenarios
- [ ] Permission revocation workflow
- [ ] Bulk permission management
- [ ] Permission expiration dates

## Testing Requirements

### Must Test

1. **Unauthorized Access**
   - User A has permission to registry 1
   - User A tries `/records/registry2` directly
   - Expect: 403 (Forbidden)

2. **Search Leakage**
   - User A searches for a record that only exists in registry 2
   - User A has no permission to registry 2
   - Expect: Zero results

3. **Admin Bypass**
   - Admin user should see all registries
   - Non-admin with no permissions should see nothing

4. **Regression Prevention**
   - Test fails if `listRegistries()` or `getAllRegistries()` is reintroduced in protected routes

## Migration Path

If we need to switch to Supabase Auth in the future:

1. Create mapping table: `clerk_user_id → supabase_user_id`
2. Update `registry_permissions` to use Supabase user IDs
3. Enable RLS policies with `auth.uid()` checks
4. Update `listAuthorizedRegistries()` to use RLS-aware queries

## References

- `src/lib/permissions.ts`: Permission checking logic
- `src/lib/admin.ts`: Admin access control
- `src/lib/roles.ts`: Role definitions
- `supabase/migrations/security_hardening_registry_permissions.sql`: Database security

