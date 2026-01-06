/**
 * Active Estate Counter Service
 * 
 * Calculates and tracks active estate counts per organization.
 * Deterministic and consistent with billing requirements.
 */

;
import { Tier } from "@/lib/tiers";

/**
 * Definition of "Active Estate"
 * 
 * An estate (client) is considered active if:
 * 1. Belongs to an organization (has orgId)
 * 2. Is not archived (archivedAt is null)
 * 3. Has at least one of:
 *    - At least one policy
 *    - At least one document
 *    - At least one active attorney access grant
 */
export interface ActiveEstateCount {
  organizationId: string;
  count: number;
  estateIds: string[];
  effectiveAt: Date;
}

/**
 * Calculate active estate count for an organization
 * 
 * This is the authoritative count used for billing.
 * Must be deterministic and consistent.
 */
export async function getActiveEstateCount(
  organizationId: string
): Promise<ActiveEstateCount> {
  const effectiveAt = new Date();

  // Get all clients for this organization that are not archived
  const clients = await prisma.clients.findMany({
    where: {
      orgId: organizationId,
      archivedAt: null, // Only non-archived clients
    },
    select: {
      id: true,
      _count: {
        select: {
          policies: true,
          documents: true,
          attorneyClientAccess: {
            where: {
              isActive: true,
              revokedAt: null,
            },
          },
        },
      },
    },
  });

  // Filter to only clients that meet "active" criteria
  const activeEstates = clients.filter((client) => {
    const { _count } = client;
    
    // Has at least one policy
    const hasPolicy = _count.policies > 0;
    
    // Has at least one document
    const hasDocument = _count.documents > 0;
    
    // Has at least one active attorney access
    const hasActiveAccess = _count.attorneyClientAccess > 0;

    // Active if any of the above is true
    return hasPolicy || hasDocument || hasActiveAccess;
  });

  return {
    organizationId,
    count: activeEstates.length,
    estateIds: activeEstates.map((e) => e.id),
    effectiveAt,
  };
}

/**
 * Check if a specific client is an active estate
 */
export async function isActiveEstate(
  clientId: string,
  organizationId: string
): Promise<boolean> {
  const client = await prisma.clients.findFirst({
    where: {
      id: clientId,
      orgId: organizationId,
      archivedAt: null,
    },
    select: {
      id: true,
      _count: {
        select: {
          policies: true,
          documents: true,
          attorneyClientAccess: {
            where: {
              isActive: true,
              revokedAt: null,
            },
          },
        },
      },
    },
  });

  if (!client) return false;

  const { _count } = client;
  return (
    _count.policies > 0 ||
    _count.documents > 0 ||
    _count.attorneyClientAccess > 0
  );
}

/**
 * Get active estate count for multiple organizations
 * Useful for batch operations or reporting
 */
export async function getActiveEstateCounts(
  organizationIds: string[]
): Promise<Map<string, ActiveEstateCount>> {
  const counts = new Map<string, ActiveEstateCount>();

  await Promise.all(
    organizationIds.map(async (orgId) => {
      const count = await getActiveEstateCount(orgId);
      counts.set(orgId, count);
    })
  );

  return counts;
}

/**
 * Check if organization is at or over active estate limit
 * Returns true if at/over limit, false otherwise
 */
export async function isAtEstateLimit(
  organizationId: string
): Promise<{ atLimit: boolean; current: number; limit: number | null }> {
  const count = await getActiveEstateCount(organizationId);
  
  // Get tier to determine limit
  const { getEffectiveTier } = await import("@/lib/contracts/features");
  const tier = await getEffectiveTier(organizationId);
  
  const { getMaxActiveEstates } = await import("@/lib/tiers");
  const limit = getMaxActiveEstates(tier);

  if (limit === null) {
    // Unlimited
    return { atLimit: false, current: count.count, limit: null };
  }

  return {
    atLimit: count.count >= limit,
    current: count.count,
    limit,
  };
}
