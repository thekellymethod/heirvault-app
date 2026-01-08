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
  const { findMany: findManyClients, count: countDb } = await import("@/lib/db");
  
  type ClientRecord = {
    id: string;
    orgId: string | null;
    archivedAt: string | null;
  };
  
  const clients = await findManyClients<ClientRecord>("clients", {
    where: {
      orgId: organizationId,
      archivedAt: null, // Only non-archived clients
    },
  });

  // For each client, check if it meets "active" criteria
  const activeEstates = [];
  for (const client of clients) {
    // Count policies
    const policiesCount = await countDb("policies", { clientId: client.id });
    
    // Count documents
    const documentsCount = await countDb("documents", { clientId: client.id });
    
    // Count active attorney access
    const accessCount = await countDb("attorney_client_access", {
      clientId: client.id,
      isActive: true,
      revokedAt: null,
    });
    
    // Active if any of the above is > 0
    if (policiesCount > 0 || documentsCount > 0 || accessCount > 0) {
      activeEstates.push(client);
    }
  }

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
  const { findUnique, count: countDb } = await import("@/lib/db");
  
  type ClientRecord = {
    id: string;
    orgId: string | null;
    archivedAt: string | null;
  };
  
  const client = await findUnique<ClientRecord>("clients", {
    id: clientId,
    orgId: organizationId,
    archivedAt: null,
  });

  if (!client) return false;

  // Count policies, documents, and active access
  const [policiesCount, documentsCount, accessCount] = await Promise.all([
    countDb("policies", { clientId }),
    countDb("documents", { clientId }),
    countDb("attorney_client_access", {
      clientId,
      isActive: true,
      revokedAt: null,
    }),
  ]);

  return policiesCount > 0 || documentsCount > 0 || accessCount > 0;
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
