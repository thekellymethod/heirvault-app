# Phase 1 — Intake (Public, No Login)

## ✅ Implementation Checklist

### 1. Intake Form UI ✓
**Location: `/app/(public)/intake/page.tsx`**

- Form UI with file input
- Fields:
  - Decedent Name (required)
  - Policy Number (optional)
  - Policy Type (optional)
  - Insurance Company (optional)
  - Contact Email (optional)
  - Contact Phone (optional)
- File upload (optional):
  - Accepts: PDF, JPEG, PNG
  - Max size: 10MB
  - Client-side validation
- Success state:
  - Displays receipt ID
  - Shows QR code
  - "Update Submission" button (links to `/update/[token]`)
  - "Submit Another" button

### 2. Intake API ✓
**Location: `/app/api/intake/route.ts`**

**Validates payload:**
- Required: `decedentName`
- Optional: `policyNumber`, `policyType`, `insurerName`, `contactEmail`, `contactPhone`
- File validation: MIME type, size limits

**Creates registry record:**
- Uses `createRegistry()` from `/lib/db`
- Status: `PENDING_VERIFICATION`
- Submitted by: `INTAKE`

**Uploads document (optional):**
- Uses `uploadFile()` from `/lib/storage`
- Content-addressed storage
- Computes SHA-256 hash
- Links document to registry version

**Computes hashes:**
- Submission hash: SHA-256 of raw submission data
- Document hash: SHA-256 of file content (if provided)

**Appends registry version (immutable):**
- Initial version created with `createRegistry()`
- If document uploaded, creates new version with document ID
- Uses `appendRegistryVersion()` for immutable versioning

**Generates update token + receipt payload:**
- QR token: `generateQRToken(registryId)` - signed, never exposes registry ID
- QR code: `generateQRCodeDataURL(registryId, baseUrl)` - QR code image
- Receipt ID: Short hash for user reference

**Audit: INTAKE_SUBMITTED**
- Logs with `logAccess()`
- Action: `INTAKE_SUBMITTED`
- Metadata: source, hasDocument, documentHash, qrToken, receiptId

### 3. Database Schema Update ✓
**Location: `src/lib/db/schema.ts`**

- Added `INTAKE_SUBMITTED` to `AccessLogAction` enum
- Migration: `prisma/migrations/20250123000000_add_intake_submitted_action/migration.sql`

### 4. Update Page ✓
**Location: `/app/(public)/update/[token]/page.tsx`**

- Decodes and verifies QR token
- Validates expiry
- Loads registry metadata (read-only)
- Displays current data
- Allows update submission via `UpdateForm` component

## Exit Criteria ✓

✅ **Submit from `/intake`**
- Form accepts all required fields
- Optional file upload works
- Validation passes

✅ **Receive receipt with token**
- Receipt ID displayed
- QR code generated
- QR token returned (signed, secure)

✅ **Token can be used to open `/update/[token]`**
- "Update Submission" button links to `/update/[token]`
- QR code links to `/update/[token]`
- Token verifies and loads registry

## Flow Diagram

```
User → /intake
  ↓
Fill form + upload file (optional)
  ↓
POST /api/intake
  ↓
Validate payload
  ↓
Create registry record
  ↓
Upload document (if provided) → Compute hash
  ↓
Append registry version (immutable)
  ↓
Generate QR token + QR code
  ↓
Audit: INTAKE_SUBMITTED
  ↓
Return receipt + QR token
  ↓
Display success page
  ↓
User clicks "Update Submission" or scans QR code
  ↓
Navigate to /update/[token]
  ↓
Token verified → Load registry → Display update form
```

## Security Features

1. **Never exposes registry ID directly**
   - All tokens are HMAC-signed
   - QR tokens contain signed payload, not raw IDs

2. **Immutable versioning**
   - Every change creates a new version row
   - Nothing updates in place
   - Complete audit trail

3. **Content-addressed storage**
   - Files stored by SHA-256 hash
   - Automatic deduplication
   - Integrity verification

4. **Comprehensive audit logging**
   - Every action logged
   - Metadata preserved
   - Legal defensibility

## Testing

### Manual Test Flow

1. Navigate to `/intake`
2. Fill form:
   - Decedent Name: "John Doe"
   - Policy Number: "POL-12345"
   - Insurance Company: "Test Insurance"
3. Upload a PDF file (optional)
4. Submit
5. Verify:
   - Success page displays
   - Receipt ID shown
   - QR code displayed
6. Click "Update Submission" or scan QR code
7. Verify:
   - Navigates to `/update/[token]`
   - Current data displayed
   - Update form available

### API Test

```bash
curl -X POST http://localhost:3000/api/intake \
  -F "decedentName=John Doe" \
  -F "policyNumber=POL-12345" \
  -F "insurerName=Test Insurance" \
  -F "file=@test-document.pdf"

# Expected response:
{
  "success": true,
  "receiptId": "ABC123...",
  "qrToken": "eyJ...",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "message": "Policy submitted successfully"
}
```

## Files Modified/Created

- ✅ `src/app/(public)/intake/page.tsx` - Form UI (already existed, enhanced)
- ✅ `src/app/api/intake/route.ts` - API endpoint (already existed, updated audit action)
- ✅ `src/lib/db/schema.ts` - Added `INTAKE_SUBMITTED` enum value
- ✅ `prisma/migrations/20250123000000_add_intake_submitted_action/migration.sql` - Database migration
- ✅ `PHASE_1_INTAKE.md` - This documentation

## Next Steps

Phase 1 is complete. The intake flow is fully functional:
- Public access (no login required)
- Form submission with optional file upload
- Registry creation with immutable versioning
- Secure token generation
- Comprehensive audit logging
- Update page integration

Ready for Phase 2 implementation.

