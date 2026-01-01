/**
 * Active Estate Count Tracker
 * 
 * Tracks active estate count changes and emits billing events when thresholds are crossed.
 * This is separate from the counter service to avoid circular dependencies.
 */

import { getActiveEstateCount, isAtEstateLimit } from "./active-estates";
import { emitActiveEstateCountChangeEvent } from "./ledger";

// Cache previous counts per organization to detect threshold crossings
const previousCounts = new Map<string, number>();

/**
 * Track active estate count and emit events on threshold crossings
 * Call this after operations that might change the count
 */
export async function trackActiveEstateCount(
  organizationId: string,
  userId?: string | null
): Promise<void> {
  try {
    const current = await getActiveEstateCount(organizationId);
    const previous = previousCounts.get(organizationId) ?? 0;
    const limitCheck = await isAtEstateLimit(organizationId);

    // Only emit if crossing significant threshold
    if (
      (previous === 0 && current.count > 0) || // First estate
      (previous > 0 && current.count === 0) || // Last estate removed
      (limitCheck.limit !== null && previous < limitCheck.limit && current.count >= limitCheck.limit) || // Reached limit
      (limitCheck.limit !== null && previous >= limitCheck.limit && current.count < limitCheck.limit) // Below limit
    ) {
      await emitActiveEstateCountChangeEvent(
        organizationId,
        previous,
        current.count,
        limitCheck.limit,
        userId
      );
    }

    // Update cache
    previousCounts.set(organizationId, current.count);
  } catch (error) {
    // Don't fail operations if event emission fails
    console.error("Failed to track active estate count:", error);
  }
}

/**
 * Initialize count for an organization (call on first access)
 */
export async function initializeEstateCount(organizationId: string): Promise<void> {
  if (!previousCounts.has(organizationId)) {
    const current = await getActiveEstateCount(organizationId);
    previousCounts.set(organizationId, current.count);
  }
}
