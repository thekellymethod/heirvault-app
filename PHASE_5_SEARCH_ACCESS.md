# Phase 5 — Search + Access Requests

## ✅ Implementation Checklist

### 1. Search Page ✓
**Location: `/app/(protected)/search/page.tsx`**

**Server action search:**
- Server component with `requireAttorney()`
- Renders `SearchView` component
- Search triggered via API route (server-side)

**Requires purpose input:**
- Purpose dropdown with controlled list:
  - Estate Administration
  - Beneficiary Claim
  - Policy Verification
  - Legal Proceeding
  - Compliance Audit
  - Other
- Purpose is required field
- Purpose is validated and logged

**Search form:**
- Purpose selection (dropdown)
- Decedent Name search field
- Client-side validation
- Submits to `/api/search` API route

### 2. Search API ✓
**Location: `/app/api/search/route.ts`**

**Role check:**
- Requires attorney authentication via `requireAttorney()`
- Ensures only attorneys can search

**Validate purpose:**
- Validates purpose is provided
- Validates purpose is in allowed list:
  - `ESTATE_ADMINISTRATION`
  - `BENEFICIARY_CLAIM`
  - `POLICY_VERIFICATION`
  - `LEGAL_PROCEEDING`
  - `COMPLIANCE_AUDIT`
  - `OTHER`
- Returns 400 if invalid purpose

**Constrained query (limited fields):**
- Only searches `decedent_name` field (no free-text global search)
- Returns limited fields only:
  - Registry ID
  - Decedent Name
  - Status
  - Created At
  - Latest Version (summary only)
- Never exposes full registry data
- Limits results to 50 to prevent data exposure
- SQL injection protection (escapes single quotes)

**Audit: SEARCH_PERFORMED**
- Logs with `logAccess()`
- Action: `SEARCH_PERFORMED`
- Registry ID: "search" (special identifier)
- Metadata:
  - source: "search_api"
  - purpose: search purpose
  - searchFields: { decedentName }
  - resultCount: number of results
  - timestamp: ISO timestamp

### 3. Access Request API ✓
**Location: `/app/api/access/route.ts`**

**Request access flow:**
- `POST /api/access` - Request access to a registry
  - Requires attorney authentication
  - Validates registry ID
  - Verifies registry exists
  - Checks if user already has access
  - Checks if request already pending
  - Creates access request (in-memory for Phase 5)
  - Returns request ID

**Approvals (admin/system):**
- `GET /api/access` - List access requests (admin only)
  - Requires admin authentication
  - Filters by status (PENDING, APPROVED, REJECTED)
  - Returns all requests with metadata

- `PATCH /api/access` - Approve/reject access request (admin only)
  - Requires admin authentication
  - Validates request ID and action
  - Updates request status
  - Grants access if approved (Phase 0: no-op, all have global access)
  - Returns updated request

**Audit: ACCESS_REQUESTED / ACCESS_GRANTED**
- `ACCESS_REQUESTED` logged when:
  - User requests access (POST)
  - Admin rejects request (PATCH with REJECT)
- `ACCESS_GRANTED` logged when:
  - Admin approves request (PATCH with APPROVE)
- Metadata includes:
  - source: "access_api"
  - requestId: access request ID
  - action: "APPROVE" or "REJECT"
  - requestedByUserId: user who requested
  - reason: optional reason
  - decedentName: registry decedent name
  - status: request status

### 4. Database Schema Update ✓
**Location: `src/lib/db/schema.ts`**

- Added `SEARCH_PERFORMED` to `AccessLogAction` enum
- Added `ACCESS_REQUESTED` to `AccessLogAction` enum
- Added `ACCESS_GRANTED` to `AccessLogAction` enum
- Migration: `prisma/migrations/20250123000003_add_search_and_access_actions/migration.sql`

## Exit Criteria ✓

✅ **Search is non-abusable**
- Purpose required and validated
- Only searches constrained fields (decedent_name)
- Results limited to 50
- No free-text global search
- SQL injection protection
- Role-based access (attorneys only)

✅ **Fully logged**
- Every search logged with `SEARCH_PERFORMED` action
- Purpose logged in metadata
- Search fields logged
- Result count logged
- User ID logged
- Timestamp logged

## Security Features

1. **Non-Abusable Search**
   - Purpose required (dropdown, not free text)
   - Only searches specific, constrained fields
   - Results limited to prevent data exposure
   - No free-text global search capability

2. **Comprehensive Audit Logging**
   - Every search logged with purpose
   - Access requests logged
   - Access grants logged
   - Complete audit trail

3. **Role-Based Access Control**
   - Search requires attorney authentication
   - Access requests require attorney authentication
   - Access approvals require admin authentication

4. **Constrained Queries**
   - Only searches `decedent_name` field
   - Returns limited fields only
   - Never exposes full registry data
   - SQL injection protection

## Testing

### Manual Test Flow

1. **Search with Purpose:**
   - Sign in as attorney
   - Visit `/search`
   - Select purpose from dropdown
   - Enter decedent name
   - Submit search
   - Verify: Results displayed
   - Verify: Limited fields only
   - Check audit logs: Should see `SEARCH_PERFORMED` entry

2. **Search Validation:**
   - Try to search without purpose
   - Verify: Error message displayed
   - Try to search with invalid purpose
   - Verify: Error message displayed

3. **Access Request:**
   - POST to `/api/access` with registryId
   - Verify: Request created
   - Check audit logs: Should see `ACCESS_REQUESTED` entry

4. **Access Approval (Admin):**
   - Sign in as admin
   - GET `/api/access` to list requests
   - PATCH `/api/access` to approve request
   - Verify: Request status updated
   - Check audit logs: Should see `ACCESS_GRANTED` entry

### API Test

```bash
# Search (requires authentication)
curl -H "Cookie: __session=..." \
  "http://localhost:3000/api/search?purpose=ESTATE_ADMINISTRATION&decedentName=John%20Doe"

# Expected response:
{
  "success": true,
  "results": [...],
  "resultCount": 5,
  "purpose": "ESTATE_ADMINISTRATION",
  "searchFields": { "decedentName": "John Doe" }
}

# Request access (requires authentication)
curl -X POST http://localhost:3000/api/access \
  -H "Cookie: __session=..." \
  -H "Content-Type: application/json" \
  -d '{"registryId": "uuid-here", "reason": "Estate administration"}'

# Expected response:
{
  "success": true,
  "requestId": "uuid-here",
  "message": "Access request submitted. Pending admin approval.",
  "status": "PENDING"
}

# Approve access (requires admin authentication)
curl -X PATCH http://localhost:3000/api/access \
  -H "Cookie: __session=..." \
  -H "Content-Type: application/json" \
  -d '{"requestId": "uuid-here", "action": "APPROVE", "reason": "Approved for estate administration"}'
```

### Database Verification

```sql
-- Check search audit logs
SELECT 
  action,
  metadata->>'purpose' as purpose,
  metadata->>'resultCount' as result_count,
  timestamp
FROM access_logs
WHERE action = 'SEARCH_PERFORMED'
ORDER BY timestamp DESC
LIMIT 20;

-- Check access request audit logs
SELECT 
  action,
  metadata->>'requestId' as request_id,
  metadata->>'action' as approval_action,
  timestamp
FROM access_logs
WHERE action IN ('ACCESS_REQUESTED', 'ACCESS_GRANTED')
ORDER BY timestamp DESC
LIMIT 20;
```

## Files Modified/Created

- ✅ `src/app/(protected)/search/page.tsx` - Already existed, verified
- ✅ `src/app/(protected)/search/_components/SearchView.tsx` - Updated purpose to dropdown
- ✅ `src/app/api/search/route.ts` - Updated to use `SEARCH_PERFORMED` action and log properly
- ✅ `src/app/api/access/route.ts` - Created access request API
- ✅ `src/lib/db/schema.ts` - Added enum values
- ✅ `prisma/migrations/20250123000003_add_search_and_access_actions/migration.sql` - Database migration
- ✅ `PHASE_5_SEARCH_ACCESS.md` - This documentation

## Key Implementation Details

### Search Non-Abuse Protection

1. **Purpose Validation**
   - Dropdown with controlled list (not free text)
   - Must select from predefined purposes
   - Purpose logged for audit

2. **Constrained Queries**
   - Only searches `decedent_name` field
   - No full-text search
   - No wildcard searches across all fields

3. **Limited Results**
   - Maximum 50 results per search
   - Prevents data exposure
   - Prevents abuse through result enumeration

4. **SQL Injection Protection**
   - Escapes single quotes in search terms
   - Uses parameterized queries via Drizzle ORM

### Access Request Flow

**Phase 5 (Current):**
- Access requests stored in-memory
- All attorneys have global access (Phase 0)
- Access requests are logged but don't affect access (no-op)

**Future:**
- Move access requests to database table
- Implement actual access grants
- Filter registries by access grants
- Organization-based access control

### Audit Logging

Every operation is logged:
- **Search**: `SEARCH_PERFORMED` with purpose, fields, result count
- **Access Request**: `ACCESS_REQUESTED` with registry ID, reason
- **Access Grant**: `ACCESS_GRANTED` with request ID, approver, reason

This provides complete audit trail for compliance and legal defensibility.

## Next Steps

Phase 5 is complete. The search and access request systems are fully functional:
- Non-abusable search with purpose validation
- Constrained queries (limited fields only)
- Comprehensive audit logging
- Access request flow with admin approvals
- Ready for future access grant implementation

Ready for Phase 6 implementation.

