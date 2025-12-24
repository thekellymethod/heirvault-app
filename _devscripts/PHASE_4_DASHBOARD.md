# Phase 4 — Dashboard + Record Detail

## ✅ Implementation Checklist

### 1. Dashboard Page ✓
**Location: `/app/(protected)/dashboard/page.tsx`**

**List authorized registries:**
- Calls `requireAttorney()` for authentication
- Fetches registries via `getAllRegistries()`
- Filters by authorization (Phase 0: all attorneys have global access)
- Future: Will use `getAuthorizedRegistryIds(user.id)` to filter

**Summary cards only:**
- Displays summary statistics:
  - Total Registries
  - Verified count
  - Pending count
  - Disputed count
- Shows registry table with key metadata:
  - Decedent Name
  - Status
  - Version count
  - Last Updated
  - Created date
- Search functionality
- Links to record detail pages

**Audit: DASHBOARD_VIEW**
- Logs with `logAccess()`
- Action: `DASHBOARD_VIEW`
- Metadata:
  - source: "dashboard_page"
  - registryCount: total registries
  - viewType: "list"
  - authorizedCount: authorized registries count

### 2. Records List Page ✓
**Location: `/app/(protected)/records/page.tsx`**

**Table view:**
- Server component with `requireAttorney()`
- Fetches authorized registries
- Displays in table format with:
  - Decedent Name
  - Status (with badges)
  - Version count
  - Last Updated
  - Created date
  - Actions (View Details button)

**Filter by status:**
- Filter dropdown with options:
  - All Statuses
  - Pending Verification
  - Verified
  - Disputed
  - Archived
  - Active
- Shows count for each status
- Real-time filtering

**Additional features:**
- Search by decedent name, status, or registry ID
- Results count display
- Links to record detail pages

**Audit: DASHBOARD_VIEW**
- Logs with `logAccess()`
- Action: `DASHBOARD_VIEW` (list view)
- Metadata:
  - source: "records_list_page"
  - registryCount: total registries
  - viewType: "table"
  - authorizedCount: authorized registries count

### 3. Record Detail Page ✓
**Location: `/app/(protected)/records/[id]/page.tsx`**

**Permission check:**
- Uses `verifyRegistryAccess(id)` to check permissions
- Ensures user is authenticated attorney
- Verifies registry exists
- Redirects to error page if access denied

**Show versions + documents + hashes:**
- Fetches registry with all versions via `getRegistryById()`
- Fetches all documents across all versions
- Groups documents by version
- Displays:
  - Registry metadata (decedent name, status)
  - Version history with timestamps
  - Documents with:
    - File name
    - File type
    - File size
    - Document hash (SHA-256)
    - Created date
    - Verification status
  - Access logs

**Audit: REGISTRY_VIEW**
- Logs with `logAccess()`
- Action: `REGISTRY_VIEW`
- Metadata:
  - source: "record_detail_page"
  - versionCount: number of versions
  - documentCount: number of documents
  - decedentName: decedent name
  - status: registry status

### 4. Database Schema Update ✓
**Location: `src/lib/db/schema.ts`**

- Added `DASHBOARD_VIEW` to `AccessLogAction` enum
- Added `REGISTRY_VIEW` to `AccessLogAction` enum
- Migration: `prisma/migrations/20250123000002_add_dashboard_and_registry_view_actions/migration.sql`

## Exit Criteria ✓

✅ **Attorneys only see records they're authorized for**
- Permission checks via `verifyRegistryAccess()` on detail pages
- `getAllRegistries()` fetches all registries (Phase 0: global access)
- Future: Will filter by `getAuthorizedRegistryIds(user.id)`
- All queries respect authorization

✅ **Every view is logged**
- Dashboard view: `DASHBOARD_VIEW` action logged
- Records list view: `DASHBOARD_VIEW` action logged
- Record detail view: `REGISTRY_VIEW` action logged
- All logs include metadata (source, counts, etc.)

## Authorization Flow

```
User visits /dashboard or /records
  ↓
Middleware: Require authentication
  ↓
Page: requireAttorney()
  ↓
Fetch registries: getAllRegistries()
  ↓
Filter by authorization (Phase 0: all authorized)
  ↓
Display registries
  ↓
Log: DASHBOARD_VIEW
```

```
User visits /records/[id]
  ↓
Middleware: Require authentication
  ↓
Page: verifyRegistryAccess(id)
  ↓
Check: canAccessRegistry(user.id, id)
  ↓
Fetch registry: getRegistryById(id)
  ↓
Display registry with versions + documents
  ↓
Log: REGISTRY_VIEW
```

## Security Features

1. **Permission Checks**
   - `verifyRegistryAccess()` on detail pages
   - `canAccessRegistry()` checks authorization
   - Redirects to error page if access denied

2. **Comprehensive Audit Logging**
   - Every view logged with specific action
   - Metadata includes source, counts, and context
   - Legal defensibility

3. **Authorization Filtering**
   - Phase 0: All attorneys have global access
   - Future: Organization-based or explicit access grants
   - Ready for fine-grained permissions

4. **Immutable Data Display**
   - Shows all versions (nothing hidden)
   - Document hashes for integrity verification
   - Complete audit trail

## Testing

### Manual Test Flow

1. **Dashboard View:**
   - Sign in as attorney
   - Visit `/dashboard`
   - Verify: Summary cards show correct counts
   - Verify: Registry table displays
   - Verify: Search works
   - Check audit logs: Should see `DASHBOARD_VIEW` entry

2. **Records List View:**
   - Visit `/records`
   - Verify: Table displays all registries
   - Verify: Status filter works
   - Verify: Search works
   - Check audit logs: Should see `DASHBOARD_VIEW` entry

3. **Record Detail View:**
   - Click "View Details" on a registry
   - Verify: Permission check passes
   - Verify: Registry details display
   - Verify: Versions shown
   - Verify: Documents with hashes shown
   - Verify: Access logs displayed
   - Check audit logs: Should see `REGISTRY_VIEW` entry

4. **Authorization Test:**
   - Sign in as different attorney
   - Visit `/records/[id]` for same registry
   - Verify: Access granted (Phase 0: global access)
   - Future: Should filter by authorization

### Database Verification

```sql
-- Check audit logs for views
SELECT 
  action,
  metadata->>'source' as source,
  metadata->>'registryCount' as registry_count,
  timestamp
FROM access_logs
WHERE action IN ('DASHBOARD_VIEW', 'REGISTRY_VIEW')
ORDER BY timestamp DESC
LIMIT 20;

-- Should show entries for:
-- - Dashboard views
-- - Records list views
-- - Registry detail views
```

## Files Modified/Created

- ✅ `src/app/(protected)/dashboard/page.tsx` - Updated to use `DASHBOARD_VIEW` action
- ✅ `src/app/(protected)/records/page.tsx` - Created with table view and status filtering
- ✅ `src/app/(protected)/records/_components/RecordsListView.tsx` - Created table view component
- ✅ `src/app/(protected)/records/[id]/page.tsx` - Updated to use `REGISTRY_VIEW` action
- ✅ `src/lib/db/schema.ts` - Added `DASHBOARD_VIEW` and `REGISTRY_VIEW` enum values
- ✅ `prisma/migrations/20250123000002_add_dashboard_and_registry_view_actions/migration.sql` - Database migration
- ✅ `PHASE_4_DASHBOARD.md` - This documentation

## Key Implementation Details

### Authorization Model

**Phase 0 (Current):**
- All attorneys have global access to all registries
- `getAllRegistries()` returns all registries
- `canAccessRegistry()` always returns true (if registry exists)

**Future:**
- Organization-based access control
- Explicit access grants
- `getAuthorizedRegistryIds(user.id)` will filter registries
- `canAccessRegistry()` will check organization membership or explicit grants

### Audit Logging

Every view is logged with:
- **Action**: Specific action type (`DASHBOARD_VIEW`, `REGISTRY_VIEW`)
- **Registry ID**: For detail views, the actual registry ID. For list views, special identifier
- **User ID**: The attorney who viewed
- **Metadata**: Context about the view (source, counts, etc.)

This provides complete audit trail for legal defensibility.

## Next Steps

Phase 4 is complete. The dashboard and record detail pages are fully functional:
- Dashboard with summary cards
- Records list with filtering
- Record detail with versions and documents
- Permission checks in place
- Comprehensive audit logging

Ready for Phase 5 implementation.

