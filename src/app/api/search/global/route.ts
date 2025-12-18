import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

/**
 * Global Search API - Searches across ALL organizations in the database
 * Only accessible to attorneys. This allows attorneys to search for clients
 * and policies outside their own organization's registry.
 * 
 * IMPORTANT: This searches the private, voluntary registry database.
 * It does NOT search insurer databases or locate unregistered policies.
 */
export async function GET(req: Request) {
  try {
    // Require attorney authentication
    const user = await requireAuth("attorney");
    
    // Get user with org memberships for audit logging
    const userWithOrg = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        orgMemberships: {
          include: {
            organization: true,
          },
        },
      },
    });
    
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ clients: [], policies: [] });
    }

    // Global search - search across ALL organizations and ALL clients
    // This includes:
    // - Clients created by attorneys through the dashboard
    // - Clients created through invitation codes
    // - Clients with or without organization assignments
    // This is a private registry search, not a comprehensive database
    // NOTE: No orgId filter - searches ALL clients in the system
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
        // Explicitly include all clients regardless of orgId (null or set)
        // This ensures all clients entered into the system are searchable
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 50, // Limit results for performance
      orderBy: {
        createdAt: "desc",
      },
    });

    // Log the global search for audit purposes (internal audit log, not visible to users)
    // This search includes ALL clients across ALL organizations
    try {
      const orgId = userWithOrg?.orgMemberships?.[0]?.organizationId || null;
      await prisma.auditLog.create({
        data: {
          action: "GLOBAL_POLICY_SEARCH_PERFORMED",
          message: `Global database search (all clients): "${q}" | Results: ${clients.length} client(s), ${policies.length} policy(ies)`,
          userId: user.id,
          orgId: orgId,
        },
      });
    } catch (auditError) {
      console.error("Failed to log global search audit:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Global search for policies - includes ALL policies across ALL organizations
    // This ensures all policies associated with any client are searchable
    const policies = await prisma.policy.findMany({
      where: {
        OR: [
          { insurer: { name: { contains: q, mode: "insensitive" } } },
          { policyNumber: { contains: q, mode: "insensitive" } },
        ],
        // No client.orgId filter - searches all policies regardless of organization
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            org: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        insurer: {
          select: {
            name: true,
          },
        },
      },
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        dateOfBirth: c.dateOfBirth,
        organization: c.org ? {
          id: c.org.id,
          name: c.org.name,
        } : null,
      })),
      policies: policies.map((p) => ({
        id: p.id,
        insurerName: p.insurer.name,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        client: {
          id: p.client.id,
          firstName: p.client.firstName,
          lastName: p.client.lastName,
          email: p.client.email,
          organization: p.client.org ? {
            id: p.client.org.id,
            name: p.client.org.name,
          } : null,
        },
      })),
      // Include disclaimer about global search
      disclaimer: "This search queries the private, voluntary registry database across ALL organizations. All clients entered into the system are included in this search. Results only include information that has been voluntarily registered. This is not a comprehensive database and does not search insurer records.",
    });
  } catch (error: any) {
    console.error("Error in global search:", error);
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

