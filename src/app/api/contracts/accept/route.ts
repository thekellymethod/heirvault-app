import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
;
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { recordContractAcceptance } from "@/lib/contracts/acceptance";
import { Tier } from "@/lib/tiers";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAuthPrincipal();
    const body = await req.json();
    const { tier, hasAuthority, jurisdiction } = body;

    if (!tier || !Object.values(Tier).includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier specified" },
        { status: 400 }
      );
    }

    if (!hasAuthority) {
      return NextResponse.json(
        { error: "Authority confirmation is required" },
        { status: 400 }
      );
    }

    const { findMany: findManyMembers, findUnique: findUniqueOrg } = await import("@/lib/db");
    
    // Get user's organization
    const memberships = await findManyMembers("org_members", {
      where: { userId: principal.dbUserId },
      limit: 1,
    });

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: "No organization found. Please complete onboarding first." },
        { status: 403 }
      );
    }

    const membership = memberships[0] as { organizationId: string };
    const org = await findUniqueOrg<{ id: string; jurisdiction: string | null }>("organizations", { id: membership.organizationId });
    
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    // Get IP and user agent for audit
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Record contract acceptance
    await recordContractAcceptance({
      organizationId: org.id,
      userId: principal.dbUserId,
      tier,
      jurisdiction: jurisdiction || org.jurisdiction || null,
      ipAddress,
      userAgent,
    });

    // Update organization jurisdiction if provided
    if (jurisdiction && !org.jurisdiction) {
      const { update: updateOrg } = await import("@/lib/db");
      await updateOrg("organizations", { id: org.id }, {
        jurisdiction,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    return NextResponse.json({
      success: true,
      message: "Contract accepted successfully",
    });
  } catch (error) {
    console.error("Contract acceptance error:", error);
    
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Contract already accepted for this tier" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept contract" },
      { status: 500 }
    );
  }
}
