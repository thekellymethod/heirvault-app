// src/app/api/org/me/route.ts
import { NextResponse } from "next/server";
import { requireAuthPrincipal } from "@/lib/permissions/guard";
;
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
        const { findMany: findManyMembers, findUnique: findUniqueOrg } = await import("@/lib/db");
        
        type OrgMemberRecord = {
          id: string;
          userId: string;
          organizationId: string;
        };
        
        const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
          where: { userId: principal.dbUserId },
          limit: 1,
        });

        if (memberships && memberships.length > 0) {
          const membership = memberships[0];
          const org = await findUniqueOrg("organizations", { id: membership.organizationId });
          
          if (org) {
            const o = org as any;
            const _active = o.billingStatus === "ACTIVE" || o.billingStatus === "TRIALING";
            
            return NextResponse.json({
              ok: true,
              org: {
                id: o.id,
                name: o.name,
                subscriptionStatus: o.billingStatus,
                currentPeriodEnd: o.currentPeriodEnd ? (typeof o.currentPeriodEnd === 'string' ? new Date(o.currentPeriodEnd) : o.currentPeriodEnd) : null,
                active: true, // Admin override: always active
                isAdmin: true,
              },
            });
          }
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
    const { findMany: findManyMembers, findUnique: findUniqueOrg } = await import("@/lib/db");
    
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
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const membership = memberships[0];
    const org = await findUniqueOrg("organizations", { id: membership.organizationId });
    
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const o = org as any;
    const active = o.billingStatus === "ACTIVE" || o.billingStatus === "TRIALING";

    return NextResponse.json({
      ok: true,
      org: {
        id: o.id,
        name: o.name,
        subscriptionStatus: o.billingStatus,
        currentPeriodEnd: o.currentPeriodEnd ? (typeof o.currentPeriodEnd === 'string' ? new Date(o.currentPeriodEnd) : o.currentPeriodEnd) : null,
        active,
        isAdmin: false,
      },
    });
  });
}

