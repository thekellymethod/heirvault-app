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

    // Get user's organization
    const membership = await prisma.org_members.findFirst({
      where: { userId: principal.dbUserId },
      include: { organizations: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found. Please complete onboarding first." },
        { status: 403 }
      );
    }

    const org = membership.organizations;

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
      await prisma.organizations.update({
        where: { id: org.id },
        data: { jurisdiction },
      });
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
