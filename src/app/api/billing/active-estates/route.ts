import { NextRequest, NextResponse } from "next/server";
import { requireAuthPrincipal } from "@/lib/permissions/guard";
;
import { getActiveEstateCount } from "@/lib/billing/active-estates";

/**
 * GET /api/billing/active-estates
 * 
 * Returns active estate count for the authenticated user's organization.
 * Internal endpoint for billing and usage tracking.
 */
export async function GET(_req: NextRequest) {
  try {
    const principal = await requireAuthPrincipal();

    // Get user's organization
    const { findMany: findManyMembers } = await import("@/lib/db");
    
    type OrgMemberRecord = {
      id: string;
      userId: string;
      organizationId: string;
    };
    
    const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: principal.dbUserId },
      limit: 1,
    });

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const orgId = memberships[0].organizationId;

    // Get active estate count
    const count = await getActiveEstateCount(orgId);

    return NextResponse.json({
      organizationId: orgId,
      count: count.count,
      estateIds: count.estateIds,
      effectiveAt: count.effectiveAt.toISOString(),
      // Optional: include limit info
      limit: await getLimitInfo(orgId),
    });
  } catch (error) {
    console.error("Error fetching active estate count:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch count" },
      { status: 500 }
    );
  }
}

/**
 * Helper to get limit information
 */
async function getLimitInfo(organizationId: string) {
  try {
    const { getEffectiveTier } = await import("@/lib/contracts/features");
    const { getMaxActiveEstates } = await import("@/lib/tiers");
    
    const tier = await getEffectiveTier(organizationId);
    const limit = getMaxActiveEstates(tier);
    
    return {
      tier,
      maxActiveEstates: limit,
      unlimited: limit === null,
    };
  } catch {
    return null;
  }
}
