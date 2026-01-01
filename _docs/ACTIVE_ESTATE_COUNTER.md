# Active Estate Counter Service

**Status:** Task 3.1 Complete ✅  
**Date:** December 2024

## Overview

A deterministic service that calculates active estate counts per organization for billing purposes. The count is calculated on-demand and is consistent with billing requirements.

## Active Estate Definition

An estate (client) is considered **active** if:

1. **Belongs to an organization** (`orgId` is set)
2. **Is not archived** (`archivedAt` is `null`)
3. **Has at least one of:**
   - At least one policy
   - At least one document
   - At least one active attorney access grant (`isActive: true`, `revokedAt: null`)

## Implementation

### Database Schema

**Added to `clients` model:**
```prisma
archivedAt        DateTime? @map("archived_at") // Soft delete - null = active, date = archived
```

**Added index:**
```prisma
@@index([orgId, archivedAt]) // Composite index for active estate queries
```

**Backward Compatibility:**
- `archivedAt` is nullable and defaults to `null`
- Existing clients are automatically considered "not archived"
- No migration needed for existing data

### Files Created

1. **`src/lib/billing/active-estates.ts`**
   - `getActiveEstateCount()` - Calculate count for organization
   - `isActiveEstate()` - Check if specific client is active
   - `getActiveEstateCounts()` - Batch count for multiple orgs
   - `isAtEstateLimit()` - Check if org is at/over limit

2. **`src/lib/billing/archive-client.ts`**
   - `archiveClient()` - Soft delete (set archivedAt)
   - `unarchiveClient()` - Restore (clear archivedAt)
   - `isClientArchived()` - Check archived status

3. **`src/app/api/billing/active-estates/route.ts`**
   - GET endpoint for active estate count
   - Returns count, estate IDs, effective date, and limit info

## API Endpoint

### GET `/api/billing/active-estates`

**Response:**
```json
{
  "organizationId": "org_123",
  "count": 5,
  "estateIds": ["client_1", "client_2", ...],
  "effectiveAt": "2024-12-20T10:30:00Z",
  "limit": {
    "tier": "BASE",
    "maxActiveEstates": 1,
    "unlimited": false
  }
}
```

**Authentication:** Required (uses authenticated user's organization)

## Count Updates

The count automatically updates when:

1. **Client created** - New client may become active if it has policy/document/access
2. **Client archived** - Setting `archivedAt` removes from count
3. **Client unarchived** - Clearing `archivedAt` may add back to count
4. **Policy added/removed** - Changes active status
5. **Document added/removed** - Changes active status
6. **Attorney access granted/revoked** - Changes active status

**Note:** Count is calculated on-demand, so it's always current. No separate counter table needed.

## Usage Examples

### Get Active Estate Count

```typescript
import { getActiveEstateCount } from '@/lib/billing/active-estates';

const count = await getActiveEstateCount(organizationId);
console.log(`Active estates: ${count.count}`);
```

### Check if at Limit

```typescript
import { isAtEstateLimit } from '@/lib/billing/active-estates';

const limitCheck = await isAtEstateLimit(organizationId);
if (limitCheck.atLimit) {
  console.log(`At limit: ${limitCheck.current}/${limitCheck.limit}`);
}
```

### Archive Client

```typescript
import { archiveClient } from '@/lib/billing/archive-client';

await archiveClient(clientId, organizationId, userId);
// Client is now excluded from active estate count
```

## Testing Scenarios

### 0 Estates
- Organization with no clients → count = 0
- Organization with only archived clients → count = 0

### Below Cap
- BASE tier (limit: 1) with 0 active estates → count = 0, atLimit = false
- BASE tier with 1 active estate → count = 1, atLimit = true

### Above Cap
- BASE tier with 2 active estates → count = 2, atLimit = true
- ACTIVE_ESTATE tier (unlimited) with any count → atLimit = false

### Create/Close/Reopen Flow
1. Create client → count increases if client has policy/document/access
2. Archive client → count decreases
3. Unarchive client → count increases if client still has policy/document/access

## Performance

- Uses composite index `[orgId, archivedAt]` for efficient queries
- Uses `_count` aggregation instead of loading full relations
- Deterministic calculation ensures consistency
- No caching needed (calculated on-demand)

## Billing Integration

The count is designed to be:
- **Deterministic** - Same inputs always produce same output
- **Consistent** - Matches billing expectations
- **Auditable** - Can be verified by querying database
- **Real-time** - Always reflects current state

---

**Implementation follows incremental refactor pattern - no breaking changes to existing functionality.**
