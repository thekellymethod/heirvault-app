import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get orgs for current user
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    const orgs = await prisma.orgMember.findMany({
      where: { clerkUserId: userId },
      select: {
        role: true,
        org: {
          select: {
            id: true,
            name: true,
            stripeSubscriptionStatus: true,
            includedActiveRegistries: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      orgs: orgs.map((m) => ({
        id: m.org.id,
        name: m.org.name,
        role: m.role,
        stripeSubscriptionStatus: m.org.stripeSubscriptionStatus,
        includedActiveRegistries: m.org.includedActiveRegistries,
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
