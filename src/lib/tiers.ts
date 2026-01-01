/**
 * Contract-Driven Tier System
 * 
 * Tiers represent operational capabilities, not just billing plans.
 * Contracts are the source of truth for feature access.
 */

export const Tier = {
  BASE: "BASE",
  ACTIVE_ESTATE: "ACTIVE_ESTATE", 
  FIRM_WIDE: "FIRM_WIDE",
} as const;

export type TierType = typeof Tier[keyof typeof Tier];

/**
 * Feature gates by tier
 * These define what operations are allowed at each tier level
 */
export const TierFeatures = {
  [Tier.BASE]: {
    // Base Tier: Basic registry operations
    maxActiveEstates: 1,
    canAccessClientData: false,
    canUploadRestrictedDocuments: false,
    canPerformGlobalSearch: false,
    canUseApiTokens: false,
    canWhiteLabel: false,
  },
  [Tier.ACTIVE_ESTATE]: {
    // Active Estate Operations: Per-estate billing
    maxActiveEstates: null, // Unlimited, but billed per estate
    canAccessClientData: true,
    canUploadRestrictedDocuments: true,
    canPerformGlobalSearch: false,
    canUseApiTokens: false,
    canWhiteLabel: false,
  },
  [Tier.FIRM_WIDE]: {
    // Firm-Wide Operations: Flat pricing, all features
    maxActiveEstates: null, // Unlimited
    canAccessClientData: true,
    canUploadRestrictedDocuments: true,
    canPerformGlobalSearch: true,
    canUseApiTokens: true,
    canWhiteLabel: true,
  },
} as const;

/**
 * Map existing BillingPlan to Tier
 * This allows backward compatibility while transitioning to tier-based system
 */
export function getTierFromBillingPlan(plan: string): TierType {
  // Legacy mapping - existing plans map to BASE tier initially
  // Users must accept contracts to unlock higher tiers
  switch (plan) {
    case "ENTERPRISE":
      return Tier.FIRM_WIDE; // Enterprise maps to Firm-Wide
    case "SMALL_FIRM":
    case "SOLO":
      return Tier.ACTIVE_ESTATE; // Paid plans map to Active Estate
    case "FREE":
    default:
      return Tier.BASE; // Free maps to Base
  }
}

/**
 * Check if a feature is available for a given tier
 */
export function hasFeatureAccess(tier: TierType, feature: keyof typeof TierFeatures[typeof Tier.BASE]): boolean {
  return TierFeatures[tier][feature] === true;
}

/**
 * Get maximum active estates for a tier
 * Returns null for unlimited
 */
export function getMaxActiveEstates(tier: TierType): number | null {
  return TierFeatures[tier].maxActiveEstates;
}
