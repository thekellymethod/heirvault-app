// src/app/api/org/me/route.ts
import { NextResponse } from "next/server";
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db";
import { withRouteGuard } from "@/lib/permissions/route";

export async function GET() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();

    const membership = await prisma.org_members.findFirst({
      where: { userId: principal.dbUserId },
      include: { organizations: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const o = membership.organizations;
    const active = o.billingStatus === "ACTIVE" || o.billingStatus === "TRIALING";

    return NextResponse.json({
      ok: true,
      org: {
        id: o.id,
        name: o.name,
        subscriptionStatus: o.billingStatus,
        currentPeriodEnd: (o as any).currentPeriodEnd,
        active,
      },
    });
  });
}

