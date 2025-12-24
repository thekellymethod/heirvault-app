# Phase 2 — Update by QR Token (Public, Controlled)

## ✅ Implementation Checklist

### 1. Update Page ✓
**Location: `/app/(public)/update/[token]/page.tsx`**

**Verify token server-side:**
- Uses `verifyQRToken(token)` to decode and verify
- Validates expiry (redirects if expired)
- Redirects to error page if invalid

**Load registry "safe" metadata:**
- Uses `getRegistryById()` to fetch registry
- Only displays safe fields (no sensitive data):
  - Decedent Name
  - Policy Number
  - Policy Type
  - Insurance Company
  - Contact Email
  - Contact Phone
- Shows current data as read-only
- Displays last update timestamp

**Show update form + optional doc upload:**
- Renders `UpdateForm` component
- Pre-fills form with current data
- Allows optional document upload
- Shows token expiry warning if < 30 days

### 2. Update Form Component ✓
**Location: `/app/(public)/update/[token]/_components/UpdateForm.tsx`**

- Pre-fills with current data
- All fields editable
- Optional file upload (PDF, JPEG, PNG, max 10MB)
- Client-side validation
- Submits to `/api/records` with token
- Success state shows confirmation

### 3. Update API ✓
**Location: `/app/api/records/route.ts`**

**Verify token:**
- Extracts token from form data
- Uses `verifyQRToken()` to validate
- Checks expiry
- Returns 403 if invalid/expired

**Append new registry version:**
- Loads current registry and latest version
- Prepares new data from form fields
- Calculates delta (what changed from previous version)
- Uses `appendRegistryVersion()` - **CRITICAL: Never updates in place**
- Creates new version row with:
  - New data
  - Delta (changes from previous version)
  - Previous version ID (lineage tracking)
  - Submission hash

**Upload doc + hash:**
- If file provided, uses `uploadFile()` (content-addressed storage)
- Computes SHA-256 hash
- Creates document record linked to new version
- Adds document hash to new version data

**Audit: REGISTRY_UPDATED_BY_TOKEN**
- Logs with `logAccess()`
- Action: `REGISTRY_UPDATED_BY_TOKEN`
- Metadata:
  - source: "qr_update"
  - versionId: new version ID
  - previousVersionId: previous version ID
  - hasDocument: boolean
  - documentHash: hash if document uploaded
  - changes: array of changed field names
  - delta: object showing from/to values

### 4. Database Schema Update ✓
**Location: `src/lib/db/schema.ts`**

- Added `REGISTRY_UPDATED_BY_TOKEN` to `AccessLogAction` enum
- Migration: `prisma/migrations/20250123000001_add_registry_updated_by_token_action/migration.sql`

## Exit Criteria ✓

✅ **Updates create a new version row**
- Uses `appendRegistryVersion()` - never updates existing rows
- Each update creates a new `registry_versions` row
- Previous version ID stored in new version data for lineage

✅ **Old versions remain intact**
- No UPDATE queries on existing version rows
- All versions preserved in database
- Complete history maintained

## Immutable Versioning Flow

```
User scans QR code or clicks update link
  ↓
Navigate to /update/[token]
  ↓
Server: Verify token → Load registry → Display safe metadata
  ↓
User fills form + uploads file (optional)
  ↓
POST /api/records with token
  ↓
Server: Verify token → Load current version
  ↓
Calculate delta (what changed)
  ↓
Upload document (if provided) → Compute hash
  ↓
Append new version row (immutable)
  ↓
Create document record (if file uploaded)
  ↓
Audit: REGISTRY_UPDATED_BY_TOKEN
  ↓
Return success
```

## Security Features

1. **Token-based access control**
   - HMAC-signed tokens
   - Expiry validation
   - No authentication required (public but controlled)

2. **Safe metadata display**
   - Only shows user-submitted data
   - No internal system IDs or sensitive data
   - Read-only display of current data

3. **Immutable versioning**
   - Every update creates new version row
   - Previous versions never modified
   - Complete audit trail

4. **Delta tracking**
   - Stores what changed (from/to values)
   - Enables change history review
   - Legal defensibility

5. **Content-addressed storage**
   - Documents stored by SHA-256 hash
   - Automatic deduplication
   - Integrity verification

## Testing

### Manual Test Flow

1. Submit intake at `/intake` (get QR token)
2. Navigate to `/update/[token]` from QR code or link
3. Verify:
   - Token verified successfully
   - Current data displayed (read-only)
   - Form pre-filled with current data
4. Make changes:
   - Update decedent name
   - Add policy number
   - Upload new document
5. Submit update
6. Verify:
   - Success message displayed
   - New version created
   - Previous version still exists
7. Submit another update
8. Verify:
   - Both previous versions still exist
   - Latest version shows most recent data
   - Delta tracking works

### API Test

```bash
# First, get a token from intake submission
# Then use it to update:

curl -X POST http://localhost:3000/api/records \
  -F "token=YOUR_QR_TOKEN" \
  -F "decedentName=Updated Name" \
  -F "policyNumber=POL-67890" \
  -F "file=@updated-document.pdf"

# Expected response:
{
  "success": true,
  "message": "Update submitted successfully. A new version has been created.",
  "versionId": "uuid-here",
  "changes": {
    "decedentName": { "from": "Old Name", "to": "Updated Name" },
    "policyNumber": { "from": null, "to": "POL-67890" }
  }
}
```

### Database Verification

```sql
-- Check that old versions remain intact
SELECT id, created_at, data_json->>'decedentName' as decedent_name
FROM registry_versions
WHERE registry_id = 'your-registry-id'
ORDER BY created_at DESC;

-- Should show all versions, oldest to newest
-- Each version should have different data
-- No versions should be modified
```

## Files Modified/Created

- ✅ `src/app/(public)/update/[token]/page.tsx` - Update page (already existed, verified)
- ✅ `src/app/(public)/update/[token]/_components/UpdateForm.tsx` - Update form (already existed, verified)
- ✅ `src/app/api/records/route.ts` - Update API (updated audit action, fixed bug)
- ✅ `src/lib/db/schema.ts` - Added `REGISTRY_UPDATED_BY_TOKEN` enum value
- ✅ `prisma/migrations/20250123000001_add_registry_updated_by_token_action/migration.sql` - Database migration
- ✅ `PHASE_2_UPDATE.md` - This documentation

## Key Implementation Details

### Immutable Versioning

The critical requirement is that **nothing ever updates in place**. The implementation ensures this by:

1. **Always using `appendRegistryVersion()`**
   - Never uses UPDATE queries on `registry_versions` table
   - Always creates new row with new UUID

2. **Storing lineage**
   - Each new version stores `previousVersionId`
   - Enables walking back through history
   - Complete chain of changes

3. **Delta tracking**
   - Calculates what changed from previous version
   - Stores from/to values in new version data
   - Enables change review without comparing full JSON

4. **Document handling**
   - New documents linked to new version
   - Old documents remain linked to old versions
   - No document records are modified

### Bug Fixes

- Fixed reference to undefined `changes` variable (should be `delta`)
- Added `previousVersionId` to metadata for better lineage tracking
- Enhanced delta tracking to include full from/to values

## Next Steps

Phase 2 is complete. The update flow is fully functional:
- Token-based access control
- Safe metadata display
- Immutable versioning
- Delta tracking
- Document upload support
- Comprehensive audit logging

Ready for Phase 3 implementation.

