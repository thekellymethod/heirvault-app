// src/app/api/org/me/route.ts
import { NextResponse } from "next/server";
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db";
import { withRouteGuard } from "@/lib/permissions/route";
import { isAdminUser } from "@/lib/auth/admin-bypass";

export async function GET() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();

    // Check admin status for override
    const isAdmin = await isAdminUser();

    // For admins without org membership, return admin override response
    if (isAdmin) {
      try {
        const membership = await prisma.org_members.findFirst({
          where: { userId: principal.dbUserId },
          include: { organizations: true },
        });

        if (membership) {
          const o = membership.organizations;
          const active = o.billingStatus === "ACTIVE" || o.billingStatus === "TRIALING";
          
          return NextResponse.json({
            ok: true,
            org: {
              id: o.id,
              name: o.name,
              subscriptionStatus: o.billingStatus,
              currentPeriodEnd: (o as { currentPeriodEnd?: Date | null }).currentPeriodEnd,
              active: true, // Admin override: always active
              isAdmin: true,
            },
          });
        }
      } catch (error) {
        // If query fails, continue with admin override response
        console.warn("Admin org query failed, using override:", error);
      }

      // Admin without org - return admin override
      return NextResponse.json({
        ok: true,
        org: {
          id: "admin",
          name: "Administrator",
          subscriptionStatus: "ACTIVE",
          currentPeriodEnd: null,
          active: true, // Admin override: always active
          isAdmin: true,
        },
      });
    }

    // Non-admin users must have org membership
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
        currentPeriodEnd: (o as { currentPeriodEnd?: Date | null }).currentPeriodEnd,
        active,
        isAdmin: false,
      },
    });
  });
}

