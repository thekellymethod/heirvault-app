import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAID_STATUSES = new Set(["trialing", "active"]);

/**
 * Create a new policy registry for an organization
 * Enforces the "5 active registries included" rule server-side
 * 
 * This is the actual policy enforcement. Auth provider doesn't matter.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const orgId = String(body?.orgId ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!orgId || !name) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId or name." },
        { status: 400 }
      );
    }

    // Membership check
    const { findUnique: findUniqueOrg, count: countRegistries, create: createRegistry, getDb } = await import("@/lib/db");
    
    const db = getDb();
    const { data: membersData } = await db
      .from("org_members")
      .select("*")
      .eq("orgId", orgId)
      .eq("clerkUserId", userId)
      .limit(1);

    if (!membersData || membersData.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Not a member of this org." },
        { status: 403 }
      );
    }

    // Get org plan + active count
    type OrgRecord = {
      id: string;
      includedActiveRegistries: number;
      stripeSubscriptionStatus: string | null;
    };
    
    const org = await findUniqueOrg<OrgRecord>("organizations", { id: orgId });

    if (!org) {
      return NextResponse.json(
        { ok: false, message: "Org not found." },
        { status: 404 }
      );
    }

    const activeCount = await countRegistries("registries", {
      where: { orgId, status: "active" },
    });

    const overIncluded = activeCount >= org.includedActiveRegistries;
    const isPaid = org.stripeSubscriptionStatus && PAID_STATUSES.has(org.stripeSubscriptionStatus);

    if (overIncluded && !isPaid) {
      return NextResponse.json(
        {
          ok: false,
          code: "BILLING_REQUIRED",
          message: `You have ${activeCount} active registries. Your plan includes ${org.includedActiveRegistries}. Add billing to create more.`,
          activeCount,
          included: org.includedActiveRegistries,
        },
        { status: 402 }
      );
    }

    const { randomUUID } = await import("crypto");
    const now = new Date().toISOString();
    const registry = await createRegistry("registries", {
      id: randomUUID(),
      orgId,
      name,
      status: "active",
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>) as { id: string };

    return NextResponse.json({
      ok: true,
      registryId: registry.id,
    });
  } catch (error) {
    console.error("Error creating registry:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
