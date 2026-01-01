/**
 * Billing Events Ledger
 * 
 * Immutable, append-only ledger for all pricing-relevant changes.
 * Tamper-resistant at application level - no update/delete operations.
 */

import { prisma } from "@/lib/db";

export type BillingEventType =
  | "tier_change"
  | "addendum_acceptance"
  | "active_estate_count_change"
  | "billing_model_transition"
  | "payment_status_change";

export interface BillingEventPayload {
  [key: string]: unknown;
}

export interface BillingEventInput {
  organizationId: string;
  eventType: BillingEventType;
  eventPayload: BillingEventPayload;
  createdByUserId?: string | null; // Null for system events
}

/**
 * Emit a billing event to the ledger
 * 
 * This is the only way to create ledger entries.
 * No update or delete operations are provided.
 */
export async function emitBillingEvent(
  input: BillingEventInput
): Promise<void> {
  await prisma.billing_events_ledger.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eventType: input.eventType,
      eventPayload: input.eventPayload,
      createdByUserId: input.createdByUserId || null,
    },
  });
}

/**
 * Emit tier change event
 */
export async function emitTierChangeEvent(
  organizationId: string,
  fromTier: string,
  toTier: string,
  reason: string,
  userId?: string | null
): Promise<void> {
  await emitBillingEvent({
    organizationId,
    eventType: "tier_change",
    eventPayload: {
      fromTier,
      toTier,
      reason,
      timestamp: new Date().toISOString(),
    },
    createdByUserId: userId,
  });
}

/**
 * Emit contract/addendum acceptance event
 */
export async function emitAddendumAcceptanceEvent(
  organizationId: string,
  tier: string,
  contractVersion: string,
  jurisdiction?: string | null,
  userId?: string | null
): Promise<void> {
  await emitBillingEvent({
    organizationId,
    eventType: "addendum_acceptance",
    eventPayload: {
      tier,
      contractVersion,
      jurisdiction: jurisdiction || null,
      timestamp: new Date().toISOString(),
    },
    createdByUserId: userId,
  });
}

/**
 * Emit active estate count change event
 * Only emitted when crossing significant thresholds (e.g., 0→1, cap reached)
 */
export async function emitActiveEstateCountChangeEvent(
  organizationId: string,
  previousCount: number,
  currentCount: number,
  limit: number | null,
  userId?: string | null
): Promise<void> {
  // Only emit if crossing significant threshold
  const crossedThreshold =
    (previousCount === 0 && currentCount > 0) || // First estate
    (previousCount > 0 && currentCount === 0) || // Last estate removed
    (limit !== null && previousCount < limit && currentCount >= limit) || // Reached limit
    (limit !== null && previousCount >= limit && currentCount < limit); // Below limit

  if (!crossedThreshold) {
    return; // Don't emit for every count change
  }

  await emitBillingEvent({
    organizationId,
    eventType: "active_estate_count_change",
    eventPayload: {
      previousCount,
      currentCount,
      limit,
      atLimit: limit !== null && currentCount >= limit,
      timestamp: new Date().toISOString(),
    },
    createdByUserId: userId,
  });
}

/**
 * Emit billing model transition event
 * e.g., switching from per-estate to firm-wide pricing
 */
export async function emitBillingModelTransitionEvent(
  organizationId: string,
  fromModel: string,
  toModel: string,
  reason: string,
  userId?: string | null
): Promise<void> {
  await emitBillingEvent({
    organizationId,
    eventType: "billing_model_transition",
    eventPayload: {
      fromModel,
      toModel,
      reason,
      timestamp: new Date().toISOString(),
    },
    createdByUserId: userId,
  });
}

/**
 * Emit payment status change event
 */
export async function emitPaymentStatusChangeEvent(
  organizationId: string,
  fromStatus: string | null,
  toStatus: string,
  stripeEventId?: string | null,
  userId?: string | null
): Promise<void> {
  await emitBillingEvent({
    organizationId,
    eventType: "payment_status_change",
    eventPayload: {
      fromStatus,
      toStatus,
      stripeEventId: stripeEventId || null,
      timestamp: new Date().toISOString(),
    },
    createdByUserId: userId, // Usually null for Stripe webhook events
  });
}
