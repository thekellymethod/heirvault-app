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
export async function GET(req: NextRequest) {
  try {
    const principal = await requireAuthPrincipal();

    // Get user's organization
    const membership = await prisma.org_members.findFirst({
      where: { userId: principal.dbUserId },
      include: { organizations: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const orgId = membership.organizations.id;

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
