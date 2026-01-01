# Billing Events Ledger

**Status:** Task 3.2 Complete ✅  
**Date:** December 2024

## Overview

An immutable, append-only ledger that records all pricing-relevant changes for audit and billing transparency. The ledger is tamper-resistant at the application level - no update or delete operations are provided.

## Database Schema

**Added to `prisma/schema.prisma`:**

```prisma
model billing_events_ledger {
  id              String   @id @default(uuid())
  organizationId  String   @map("organization_id")
  eventType       String   @map("event_type")
  eventPayload    Json     @map("event_payload")
  createdAt       DateTime @default(now()) @map("created_at")
  createdByUserId String?  @map("created_by_user_id") // Nullable for system events
  // Immutable - no updatedAt field, no delete capability at application level
  organizations   organizations @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  users           User?        @relation("BillingEventCreator", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([organizationId, createdAt])
  @@index([eventType, createdAt])
  @@index([createdAt])
  @@map("billing_events_ledger")
}
```

**Event Types:**
- `tier_change` - Tier upgrades/downgrades
- `addendum_acceptance` - Contract acceptance creation
- `active_estate_count_change` - Active estate count threshold crossings
- `billing_model_transition` - Switching to firm-wide pricing
- `payment_status_change` - Payment status changes from Stripe

## Implementation

### Files Created

1. **`src/lib/billing/ledger.ts`**
   - `emitBillingEvent()` - Core event emission function
   - `emitTierChangeEvent()` - Tier change events
   - `emitAddendumAcceptanceEvent()` - Contract acceptance events
   - `emitActiveEstateCountChangeEvent()` - Estate count threshold events
   - `emitBillingModelTransitionEvent()` - Billing model transition events
   - `emitPaymentStatusChangeEvent()` - Payment status change events

2. **`src/lib/billing/active-estates-tracker.ts`**
   - `trackActiveEstateCount()` - Tracks count changes and emits events on threshold crossings
   - `initializeEstateCount()` - Initialize count cache for organization

3. **`src/app/api/admin/billing-ledger/route.ts`**
   - GET endpoint for admin read access
   - Paginated results with filtering

### Event Emission Hooks

**Contract Acceptance:**
- `src/lib/contracts/acceptance.ts` - Emits `addendum_acceptance` event

**Payment Status Changes:**
- `src/app/api/billing/webhook/route.ts` - Emits `payment_status_change` events from Stripe webhooks

**Active Estate Count Changes:**
- `src/lib/billing/archive-client.ts` - Tracks count on archive/unarchive
- `src/app/api/clients/route.ts` - Tracks count on client creation

**Tier Changes:**
- (To be added when tier upgrade flows are implemented)

**Billing Model Transitions:**
- (To be added when firm-wide pricing is implemented)

## API Endpoint

### GET `/api/admin/billing-ledger`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50, max: 100)
- `eventType` - Filter by event type
- `since` - ISO date string to filter events after this date

**Response:**
```json
{
  "organizationId": "org_123",
  "events": [
    {
      "id": "event_123",
      "eventType": "addendum_acceptance",
      "eventPayload": {
        "tier": "BASE",
        "contractVersion": "1.0.0",
        "jurisdiction": "CA",
        "timestamp": "2024-12-20T10:30:00Z"
      },
      "createdAt": "2024-12-20T10:30:00Z",
      "createdBy": {
        "id": "user_123",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1,
    "hasMore": false
  }
}
```

**Authentication:** Admin-only (uses `requireAdmin()`)

## Event Payloads

### `tier_change`
```json
{
  "fromTier": "BASE",
  "toTier": "ACTIVE_ESTATE",
  "reason": "upgrade_requested",
  "timestamp": "2024-12-20T10:30:00Z"
}
```

### `addendum_acceptance`
```json
{
  "tier": "BASE",
  "contractVersion": "1.0.0",
  "jurisdiction": "CA",
  "timestamp": "2024-12-20T10:30:00Z"
}
```

### `active_estate_count_change`
```json
{
  "previousCount": 0,
  "currentCount": 1,
  "limit": 1,
  "atLimit": true,
  "timestamp": "2024-12-20T10:30:00Z"
}
```

### `billing_model_transition`
```json
{
  "fromModel": "per_estate",
  "toModel": "firm_wide",
  "reason": "upgrade_to_firm_wide",
  "timestamp": "2024-12-20T10:30:00Z"
}
```

### `payment_status_change`
```json
{
  "fromStatus": "INACTIVE",
  "toStatus": "ACTIVE",
  "stripeEventId": "evt_123",
  "timestamp": "2024-12-20T10:30:00Z"
}
```

## Tamper Resistance

**Application Level:**
- No `update()` or `delete()` operations provided
- Only `create()` operation via `emitBillingEvent()`
- All events are immutable once created

**Database Level:**
- Consider adding database triggers to prevent updates/deletes
- Consider read-only user for ledger queries
- Consider audit logging of any direct database access

## Usage Examples

### Emit Contract Acceptance Event

```typescript
import { emitAddendumAcceptanceEvent } from '@/lib/billing/ledger';

await emitAddendumAcceptanceEvent(
  organizationId,
  "BASE",
  "1.0.0",
  "CA",
  userId
);
```

### Track Active Estate Count

```typescript
import { trackActiveEstateCount } from '@/lib/billing/active-estates-tracker';

// After creating/archiving a client
await trackActiveEstateCount(organizationId, userId);
```

### Query Ledger (Admin)

```typescript
// GET /api/admin/billing-ledger?page=1&limit=50&eventType=addendum_acceptance
```

## Testing Scenarios

### Contract Acceptance
- ✅ Event emitted when contract accepted
- ✅ Event includes tier, version, jurisdiction
- ✅ Event includes user who accepted

### Payment Status Changes
- ✅ Event emitted on subscription status change
- ✅ Event includes previous and new status
- ✅ Event includes Stripe event ID

### Active Estate Count
- ✅ Event emitted when crossing 0→1 threshold
- ✅ Event emitted when crossing limit threshold
- ✅ Event not emitted for minor count changes

### Admin Endpoint
- ✅ Returns paginated results
- ✅ Filters by organization
- ✅ Filters by event type
- ✅ Filters by date range
- ✅ Returns correct ordering (newest first)

---

**Implementation follows incremental refactor pattern - no breaking changes to existing functionality.**
