import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
    const member = await prisma.orgMember.findUnique({
      where: { orgId_clerkUserId: { orgId, clerkUserId: userId } },
      select: { role: true },
    });

    if (!member) {
      return NextResponse.json(
        { ok: false, message: "Not a member of this org." },
        { status: 403 }
      );
    }

    // Get org plan + active count
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        includedActiveRegistries: true,
        stripeSubscriptionStatus: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { ok: false, message: "Org not found." },
        { status: 404 }
      );
    }

    const activeCount = await prisma.registry.count({
      where: { orgId, status: "active" },
    });

    const overIncluded = activeCount >= org.includedActiveRegistries;
    const isPaid = PAID_STATUSES.has(org.stripeSubscriptionStatus);

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

    const registry = await prisma.registry.create({
      data: { orgId, name, status: "active" },
      select: { id: true },
    });

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
