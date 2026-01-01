# Document Category Taxonomy Implementation

**Status:** Task 2.1 Complete ✅  
**Date:** December 2024

## Overview

A document taxonomy system that classifies documents by legal function, enabling tier-based access control and better document organization.

## Taxonomy Categories

### AUTHORITY
Documents establishing legal authority to act on behalf of another party.

**Examples:**
- Power of Attorney
- Guardianship Orders
- Court-Appointed Conservatorship
- Trustee Appointment Letters

### OWNERSHIP
Documents proving ownership, beneficiary status, or legal interest.

**Examples:**
- Policy Ownership Documents
- Beneficiary Designation Forms
- Deed of Trust
- Property Titles

### LIQUIDITY
Documents related to financial assets, account access, and payment authorization.

**Examples:**
- Bank Statements
- Account Authorization Forms
- Payment Instructions
- Financial Account Documents

### CONTINUITY
Documents ensuring business or estate continuity during transitions.

**Examples:**
- Succession Plans
- Business Continuity Agreements
- Estate Planning Documents
- Transition Plans

### INTENT
Documents expressing intent, wishes, or designations.

**Examples:**
- Wills
- Trust Documents
- Beneficiary Designations
- Letter of Intent

## Implementation Details

### Database Schema

**Added to `documents` model:**
```prisma
documentCategory    DocumentCategory?     @map("document_category")
```

**New Enum:**
```prisma
enum DocumentCategory {
  AUTHORITY
  OWNERSHIP
  LIQUIDITY
  CONTINUITY
  INTENT
}
```

### Automatic Category Mapping

The system automatically maps existing `fileType` values to categories:

- **AUTHORITY**: Power of Attorney, Guardianship, Conservatorship, Trustee, Court filings
- **OWNERSHIP**: Policy ownership, Beneficiary, Deed, Title, Policy documents
- **LIQUIDITY**: Bank, Account, Financial, Payment, Tax documents (W9, 1040)
- **CONTINUITY**: Succession, Continuity, Transition, Estate planning
- **INTENT**: Will, Trust, Designation, Letter of Intent

### Files Created

1. **`src/lib/documents/taxonomy.ts`**
   - Category definitions
   - Mapping functions from `fileType` to category
   - Taxonomy configuration generator

2. **`src/app/api/config/document-taxonomy/route.ts`**
   - Read-only API endpoint for frontend
   - Returns category definitions and metadata
   - Cached for 1 hour

3. **`src/lib/documents/backfill-categories.ts`**
   - Utility to backfill legacy documents
   - Batch processing support
   - Statistics generation

4. **`src/app/api/admin/backfill-document-categories/route.ts`**
   - Admin-only endpoint for backfilling
   - Statistics endpoint

### Updated Files

1. **`prisma/schema.prisma`**
   - Added `DocumentCategory` enum
   - Added `documentCategory` field to `documents` model

2. **`src/app/api/public/upload/route.ts`**
   - Automatically maps category on upload

3. **`src/app/api/public/change-request/upload/route.ts`**
   - Automatically maps category on upload

## Usage

### Frontend Integration

```typescript
// Fetch taxonomy configuration
const response = await fetch('/api/config/document-taxonomy');
const taxonomy = await response.json();

// taxonomy.categories contains all category definitions
// taxonomy.version for versioning
```

### Automatic Categorization

New uploads are automatically categorized based on `fileType`:

```typescript
import { getDocumentCategory } from '@/lib/documents/taxonomy';

const category = getDocumentCategory(fileType, existingCategory);
// Returns DocumentCategory or null if unmapped
```

### Backfilling Legacy Documents

Admin endpoint to backfill existing documents:

```bash
# Backfill categories (admin only)
POST /api/admin/backfill-document-categories
{
  "batchSize": 100
}

# Get category statistics
GET /api/admin/backfill-document-categories
```

## Backward Compatibility

### Legacy Documents

- `documentCategory` is **nullable** - existing documents without category continue to work
- Queries that don't filter by category are unaffected
- Category can be set later via backfill or manual update

### Existing Uploads

- All existing upload endpoints continue to work
- Category is automatically assigned when possible
- If unmapped, category remains `null` (safe default)

## Future Tier Gating

The taxonomy is designed to support tier-based access control:

- **BASE Tier**: May only access certain categories
- **ACTIVE_ESTATE Tier**: Access to more categories
- **FIRM_WIDE Tier**: Full access to all categories

Access rules will be enforced server-side in feature gates, not hardcoded in UI.

## Migration Steps

1. **Run database migration:**
   ```bash
   npx prisma migrate dev --name add_document_category_taxonomy
   npx prisma generate
   ```

2. **Backfill existing documents (optional):**
   ```bash
   # As admin, call the backfill endpoint
   POST /api/admin/backfill-document-categories
   ```

3. **Verify:**
   - Check that new uploads have categories
   - Verify legacy documents still work
   - Test taxonomy API endpoint

## Testing Checklist

- [ ] New document uploads get categorized
- [ ] Legacy documents without category still work
- [ ] Taxonomy API returns correct structure
- [ ] Backfill endpoint works for admins
- [ ] Queries without category filter work
- [ ] Category mapping covers common file types

---

**Implementation follows incremental refactor pattern - no breaking changes to existing functionality.**
