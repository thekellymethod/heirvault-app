# Contract-Driven Infrastructure Implementation

**Status:** Phase 1 Complete ✅  
**Date:** December 2024

## Overview

This implementation introduces a contract-driven tier system that layers onto the existing architecture without breaking current user flows. Contracts are the source of truth for feature access.

## Phase 1: Revenue Foundation (COMPLETE)

### ✅ Task 1.1: Tier Constants & Feature Gates

**Files Created:**
- `src/lib/tiers.ts` - Tier definitions and feature gates

**Tiers:**
- `BASE` - Basic registry operations (1 active estate, no client data access)
- `ACTIVE_ESTATE` - Per-estate billing (unlimited estates, client data access)
- `FIRM_WIDE` - Flat pricing (all features, API access, white-label)

**Feature Gates:**
- `maxActiveEstates` - Estate limit per tier
- `canAccessClientData` - Client data access
- `canUploadRestrictedDocuments` - Restricted document uploads
- `canPerformGlobalSearch` - Global policy search
- `canUseApiTokens` - API token access
- `canWhiteLabel` - White-label capabilities

### ✅ Task 1.2: Contract Acceptance Persistence

**Database Schema:**
- Added `contract_acceptances` table (immutable records)
- Added `jurisdiction` field to `organizations` table
- Added relations to `User` and `organizations` models

**Files Created:**
- `src/lib/contracts/acceptance.ts` - Contract acceptance management
- `src/lib/contracts/features.ts` - Feature gate enforcement

**Key Functions:**
- `recordContractAcceptance()` - Create immutable acceptance record
- `hasAcceptedContract()` - Check if contract accepted
- `requireBaseTierAcceptance()` - Gate function for dashboard access
- `getEffectiveTier()` - Determine actual tier based on contracts
- `requireFeatureAccess()` - Server-side feature gate enforcement

### ✅ Task 1.3: Base Tier Acceptance Screen

**Files Created:**
- `src/app/attorney/onboard/contract/page.tsx` - Base Tier acceptance UI
- `src/app/api/contracts/accept/route.ts` - Contract acceptance API

**Integration:**
- Updated `src/app/attorney/onboard/page.tsx` to redirect to contract acceptance
- Updated `src/app/dashboard/page.tsx` to require Base Tier acceptance

**Flow:**
1. User completes organization setup
2. Redirected to `/attorney/onboard/contract`
3. Must accept Base Tier contract with authority confirmation
4. Redirected to dashboard after acceptance

## Database Migration Required

Run the following migration to add the new tables and fields:

```bash
npx prisma migrate dev --name add_contract_acceptances
```

**Schema Changes:**
- `contract_acceptances` table with immutable acceptance records
- `jurisdiction` field on `organizations` table
- Relations between `contract_acceptances`, `organizations`, and `users`

## Next Steps: Phase 2 (Upsell Enablement)

### Task 1.4: Tier 2 Upgrade Modal
- Trigger on estate cap exceeded
- Trigger on client access toggle
- Trigger on restricted document upload
- Enforce acceptance + billing update

### Task 1.5: Firm-Wide Upgrade Flow
- Flat pricing mode
- Suspend per-estate billing
- Preserve downgrade capability

### Task 1.6: Jurisdiction Injection
- Capture during onboarding
- Store in acceptance records
- Inject into governing-law clauses

## Architecture Notes

### Backward Compatibility
- Existing `BillingPlan` enum preserved
- Tier system maps to existing plans
- No breaking changes to current flows

### Security
- All feature gates are server-side
- Cannot be bypassed via frontend state
- Contract acceptances are immutable
- Audit trail for all acceptances

### Contract Versioning
- Current version: `1.0.0`
- Stored in `contractVersion` field
- Allows future contract updates

## Testing Checklist

- [ ] New user onboarding flow
- [ ] Base Tier contract acceptance
- [ ] Dashboard access gating
- [ ] Contract acceptance API
- [ ] Feature gate enforcement
- [ ] Database migration

---

**Implementation follows incremental refactor pattern - no breaking changes to existing functionality.**
