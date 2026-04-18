import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/authz";
import { organizationIdFromMemberRow } from "@/lib/org/membershipRow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get orgs for current user
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    const { findMany: findManyMembers, findUnique: findUniqueOrg } = await import("@/lib/db");
    
    type OrgMemberRecord = {
      id: string;
      clerkUserId: string;
      role: string;
      organizationId: string;
      createdAt: string;
    };
    
    type OrgRecord = {
      id: string;
      name: string;
      stripeSubscriptionStatus: string | null;
      includedActiveRegistries: number;
    };
    
    const members = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { clerkUserId: userId },
      orderBy: { column: "createdAt", ascending: false },
    });

    // Fetch organizations for each member
    const orgs = await Promise.all(
      (members || []).map(async (m) => {
        const oid = organizationIdFromMemberRow(m as Record<string, unknown>);
        const org = oid
          ? await findUniqueOrg<OrgRecord>("organizations", { id: oid })
          : null;
        return {
          member: m,
          org: org || null,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      orgs: orgs
        .filter((o) => o.org !== null)
        .map((o) => ({
          id: o.org!.id,
          name: o.org!.name,
          role: o.member.role,
          stripeSubscriptionStatus: o.org!.stripeSubscriptionStatus,
          includedActiveRegistries: o.org!.includedActiveRegistries,
        })),
    });
  } catch (error) {
    console.error("Error in orgs route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}
