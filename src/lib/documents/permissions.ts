/**
 * Document Category Permissions
 * 
 * Enforces tier-based access control for document categories.
 * Server-side only - cannot be bypassed via frontend.
 */

import type { DocumentCategory } from "@/lib/db";
import { Tier, type TierType } from "@/lib/tiers";
import { DOCUMENT_CATEGORIES } from "./taxonomy";

/**
 * Document categories that require ACTIVE_ESTATE tier or higher
 * BASE tier cannot upload these categories
 */
export const RESTRICTED_CATEGORIES: DocumentCategory[] = [
  DOCUMENT_CATEGORIES.LIQUIDITY,      // Tax records, bank statements, financial docs
  DOCUMENT_CATEGORIES.CONTINUITY,      // Business succession, estate planning
  // Restricted OWNERSHIP types (deeds, titles) - but basic policy ownership is allowed
];

/**
 * Check if a document category is restricted for a given tier
 */
export function isCategoryRestricted(
  category: DocumentCategory | null,
  tier: TierType
): boolean {
  // No category = not restricted (legacy documents)
  if (!category) {
    return false;
  }

  // BASE tier cannot upload restricted categories
  if (tier === Tier.BASE) {
    return RESTRICTED_CATEGORIES.includes(category);
  }

  // ACTIVE_ESTATE and FIRM_WIDE can upload all categories
  return false;
}

/**
 * Get required tier for a document category
 */
export function getRequiredTierForCategory(
  category: DocumentCategory | null
): TierType | null {
  if (!category) {
    return null; // No category = no restriction
  }

  if (RESTRICTED_CATEGORIES.includes(category)) {
    return Tier.ACTIVE_ESTATE;
  }

  // All other categories are allowed at BASE tier
  return Tier.BASE;
}

/**
 * Check if organization can upload a document with given category
 * Returns error object if denied, null if allowed
 */
export function checkDocumentUploadPermission(
  tier: TierType,
  category: DocumentCategory | null
): { code: string; requiredTier: TierType; reason: string } | null {
  if (isCategoryRestricted(category, tier)) {
    const requiredTier = getRequiredTierForCategory(category);
    
    return {
      code: "TIER_UPGRADE_REQUIRED",
      requiredTier: requiredTier || Tier.ACTIVE_ESTATE,
      reason: "restricted_document_category",
    };
  }

  return null;
}

/**
 * Get human-readable category restriction info
 */
export function getCategoryRestrictionInfo(category: DocumentCategory | null): {
  restricted: boolean;
  requiredTier: TierType | null;
  message: string;
} {
  const requiredTier = getRequiredTierForCategory(category);
  const restricted = requiredTier !== null && requiredTier !== Tier.BASE;

  let message = "";
  if (restricted) {
    message = `This document category requires ${requiredTier === Tier.ACTIVE_ESTATE ? "Active Estate Operations" : "Firm-Wide Operations"} tier.`;
  }

  return {
    restricted,
    requiredTier,
    message,
  };
}
