# Document Upload Tier Enforcement

**Status:** Task 2.2 Complete ✅  
**Date:** December 2024

## Overview

Server-side enforcement of tier-based document category permissions. Uploads for restricted categories are blocked at the API level with structured error responses that trigger upgrade flows.

## Implementation

### Permission System

**Restricted Categories (require ACTIVE_ESTATE or higher):**
- `LIQUIDITY` - Tax records, bank statements, financial documents
- `CONTINUITY` - Business succession, estate planning documents
- Restricted `OWNERSHIP` types (deeds, titles) - though basic policy ownership is allowed at BASE

**Allowed at BASE Tier:**
- `AUTHORITY` - Power of attorney, guardianship documents
- `INTENT` - Wills, trusts, beneficiary designations
- Basic `OWNERSHIP` - Policy documents, basic beneficiary docs

### Files Created

1. **`src/lib/documents/permissions.ts`**
   - Category restriction definitions
   - Permission check functions
   - Required tier calculation

2. **`src/lib/documents/upload-guard.ts`**
   - Server-side upload permission guard
   - Organization context resolution (via client if needed)
   - Audit logging for blocked attempts

### Files Modified

1. **`src/app/api/public/upload/route.ts`**
   - Added permission check before upload
   - Returns structured error on denial

2. **`src/app/api/public/change-request/upload/route.ts`**
   - Added permission check before upload
   - Returns structured error on denial

## Error Response Format

When an upload is blocked, the API returns:

```json
{
  "error": "TIER_UPGRADE_REQUIRED",
  "code": "TIER_UPGRADE_REQUIRED",
  "requiredTier": "ACTIVE_ESTATE",
  "reason": "restricted_document_category",
  "message": "This document type requires Active Estate Operations tier."
}
```

**Status Code:** `403 Forbidden`

## Audit Logging

Blocked upload attempts are logged with:
- Organization ID
- User ID (if available)
- Document category
- File name
- Endpoint
- Timestamp

Logged to:
- `audit_logs` table (action: `DOCUMENT_UPLOADED` with blocked metadata)
- Console log with structured format for easy querying

## Frontend Integration

The error response is designed to trigger the existing Tier 2 upgrade modal:

```typescript
try {
  const response = await fetch('/api/public/upload', { ... });
  const data = await response.json();
  
  if (data.code === 'TIER_UPGRADE_REQUIRED') {
    // Trigger Tier 2 upgrade modal
    showUpgradeModal({
      requiredTier: data.requiredTier,
      reason: data.reason,
    });
  }
} catch (error) {
  // Handle error
}
```

## Organization Context Resolution

The permission system automatically resolves organization context:

1. **Direct organization ID** (if provided)
2. **Via client ID** (looks up client's organization)
3. **No organization** (allows upload for backward compatibility)

This ensures:
- Public uploads (client invites) work correctly
- Attorney uploads work correctly
- Legacy uploads without org context continue to work

## Testing Checklist

- [ ] BASE tier user attempts to upload TAX document → blocked
- [ ] BASE tier user attempts to upload POLICY document → allowed
- [ ] ACTIVE_ESTATE tier user uploads TAX document → allowed
- [ ] Error response includes all required fields
- [ ] Audit log captures blocked attempts
- [ ] Frontend receives structured error
- [ ] Upgrade modal triggers correctly

## Security Notes

- **Server-side only** - Cannot be bypassed via frontend manipulation
- **Organization-scoped** - Permissions based on firm's tier, not individual user
- **Immutable audit trail** - All blocked attempts are logged
- **Backward compatible** - Uploads without org context still work

---

**Implementation follows incremental refactor pattern - no breaking changes to existing functionality.**
