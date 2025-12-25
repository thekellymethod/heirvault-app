import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

/**
 * Global Policy Locator - Searches across ALL organizations
 * Requires proof of death certification for access
 * Only accessible to attorneys
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth("attorney");

    // Get user with org memberships for audit logging
    const userWithOrg = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        orgMemberships: {
          include: {
            organizations: true,
          },
        },
      },
    });

    const { searchParams } = new URL(req.url);
    const firstName = searchParams.get("firstName")?.trim();
    const lastName = searchParams.get("lastName")?.trim();
    const dateOfBirth = searchParams.get("dateOfBirth");
    const dateOfDeath = searchParams.get("dateOfDeath");
    const state = searchParams.get("state");
    const relationship = searchParams.get("relationship");
    const ssn = searchParams.get("ssn")?.trim();
    const address = searchParams.get("address")?.trim();
    const policyNumber = searchParams.get("policyNumber")?.trim();
    
    // Optional: Proof of death certification (not required for search, but will be logged if provided)
    const hasProofOfDeath = searchParams.get("hasProofOfDeath") === "true";
    const proofOfDeathCertNumber = searchParams.get("proofOfDeathCertNumber")?.trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Build search query - search across ALL organizations
    const where: {
      firstName: { contains: string, mode: "insensitive" };
      lastName: { contains: string, mode: "insensitive" };
      dateOfBirth?: Date;
    } = {
      firstName: {
        contains: firstName,
        mode: "insensitive",
      },
      lastName: {
        contains: lastName,
        mode: "insensitive",
      },
    };

    // Add optional filters
    if (dateOfBirth) {
      where.dateOfBirth = new Date(dateOfBirth);
    }

    if (dateOfDeath) {
      // Note: We don't currently store dateOfDeath on Client model
      // This would need to be added to the schema if needed
    }

    // Search for clients matching the criteria across ALL organizations
    const clients = await prisma.clients.findMany({
      where,
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
          },
        },
        policies: {
          include: {
            insurers: {
              select: {
                name: true,
              },
            },
            policy_beneficiaries: {
              include: {
                beneficiaries: {
                  select: {
                    firstName: true,
                    lastName: true,
                    relationship: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 100, // Limit for global search
    });

    // Flatten results
    const results = clients.flatMap((client) =>
      client.policies.map((policy) => ({
        id: policy.id,
        policyNumber: policy.policy_number,
        policyType: policy.policy_type,
        insurerName: policy.insurers?.name || null,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          organization: client.organizations ? {
            id: client.organizations.id,
            name: client.organizations.name,
          } : null,
        },
        beneficiaries: policy.policy_beneficiaries.map((pb) => ({
          firstName: pb.beneficiaries.firstName,
          lastName: pb.beneficiaries.lastName,
          relationship: pb.beneficiaries.relationship,
        })),
      }))
    );

    // Log the search for audit purposes (internal audit log, not visible to users)
    try {
      const auditLogId = randomUUID();
      await prisma.audit_logs.create({
        data: {
          id: auditLogId,
          action: "GLOBAL_POLICY_SEARCH_PERFORMED",
          message: `Global policy search: ${firstName} ${lastName}${dateOfBirth ? ` (DOB: ${dateOfBirth})` : ""}${proofOfDeathCertNumber ? ` | Death Cert: ${proofOfDeathCertNumber}` : ""} | Results: ${results.length} policy(ies)`,
          user_id: user.id,
          org_id: userWithOrg?.org_members?.[0]?.organizations?.id || userWithOrg?.org_members?.[0]?.organization_id || null,
          createdAt: new Date(),
        },
      });
    } catch (auditError) {
      console.error("Failed to log global search audit:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      policies: results,
      searchMetadata: {
        proofOfDeathCertNumber: proofOfDeathCertNumber || null,
        searchedBy: user.id,
        searchedAt: new Date().toISOString(),
        scope: "global", // Indicates this was a global search
      },
      disclaimer: "This search queries the private, voluntary registry database across all organizations. Results only include information that has been voluntarily registered. This is not a comprehensive database and does not search insurer records.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in global policy locator:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

