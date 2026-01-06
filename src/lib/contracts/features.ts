/**
 * Feature Gate Enforcement
 * 
 * Server-side feature gates based on tier and contract acceptance.
 * These cannot be bypassed via frontend state manipulation.
 */

;
import { Tier, TierFeatures, type TierType, getTierFromBillingPlan, hasFeatureAccess } from "@/lib/tiers";
import { hasAcceptedContract } from "./acceptance";
import { HttpError } from "@/lib/permissions/guard";

/**
 * Get effective tier for an organization
 * Checks contract acceptance to determine actual tier access
 */
export async function getEffectiveTier(organizationId: string): Promise<TierType> {
  // Get organization billing plan
  const org = await prisma.organizations.findUnique({
    where: { id: organizationId },
    select: { billingPlan: true },
  });

  if (!org) {
    throw new HttpError(404, "ORGANIZATION_NOT_FOUND", "Organization not found");
  }

  // Map billing plan to tier
  const tier = getTierFromBillingPlan(org.billingPlan);

  // Check contract acceptance for each tier level
  // Start from highest tier and work down
  if (tier === Tier.FIRM_WIDE) {
    const hasFirmWide = await hasAcceptedContract(organizationId, Tier.FIRM_WIDE);
    if (hasFirmWide) return Tier.FIRM_WIDE;
  }

  if (tier === Tier.FIRM_WIDE || tier === Tier.ACTIVE_ESTATE) {
    const hasActiveEstate = await hasAcceptedContract(organizationId, Tier.ACTIVE_ESTATE);
    if (hasActiveEstate) return Tier.ACTIVE_ESTATE;
  }

  // Base tier is always required
  const hasBase = await hasAcceptedContract(organizationId, Tier.BASE);
  if (hasBase) return Tier.BASE;

  // No contract accepted - return BASE but will be blocked by requireBaseTierAcceptance
  return Tier.BASE;
}

/**
 * Require feature access - throws 403 if feature not available
 */
export async function requireFeatureAccess(
  organizationId: string,
  feature: keyof typeof TierFeatures[typeof Tier.BASE]
): Promise<void> {
  const tier = await getEffectiveTier(organizationId);
  const hasAccess = hasFeatureAccess(tier, feature);

  if (!hasAccess) {
    throw new HttpError(
      403,
      "FEATURE_NOT_AVAILABLE",
      `This feature requires ${tier === Tier.BASE ? "Active Estate Operations" : "Firm-Wide Operations"} tier.`
    );
  }
}

/**
 * Check if organization can access client data
 */
export async function canAccessClientData(organizationId: string): Promise<boolean> {
  try {
    await requireFeatureAccess(organizationId, "canAccessClientData");
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if organization can upload restricted documents
 */
export async function canUploadRestrictedDocuments(organizationId: string): Promise<boolean> {
  try {
    await requireFeatureAccess(organizationId, "canUploadRestrictedDocuments");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get maximum active estates for organization
 */
export async function getMaxActiveEstates(organizationId: string): Promise<number | null> {
  const tier = await getEffectiveTier(organizationId);
  return TierFeatures[tier].maxActiveEstates;
}
