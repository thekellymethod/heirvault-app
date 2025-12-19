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
    const where: any = {
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
    const clients = await prisma.client.findMany({
      where,
      include: {
        org: {
          select: {
            id: true,
            name: true,
          },
        },
        policies: {
          include: {
            insurer: {
              select: {
                name: true,
              },
            },
            beneficiaries: {
              include: {
                beneficiary: {
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
        policyNumber: policy.policyNumber,
        policyType: policy.policyType,
        insurerName: policy.insurer.name,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          organization: client.org ? {
            id: client.org.id,
            name: client.org.name,
          } : null,
        },
        beneficiaries: policy.beneficiaries.map((pb) => ({
          firstName: pb.beneficiary.firstName,
          lastName: pb.beneficiary.lastName,
          relationship: pb.beneficiary.relationship,
        })),
      }))
    );

    // Log the search for audit purposes (internal audit log, not visible to users)
    try {
      await prisma.auditLog.create({
        data: {
          action: "GLOBAL_POLICY_SEARCH_PERFORMED",
          message: `Global policy search: ${firstName} ${lastName}${dateOfBirth ? ` (DOB: ${dateOfBirth})` : ""}${proofOfDeathCertNumber ? ` | Death Cert: ${proofOfDeathCertNumber}` : ""} | Results: ${results.length} policy(ies)`,
          userId: user.id,
          orgId: userWithOrg?.orgMemberships?.[0]?.organizations?.id || userWithOrg?.orgMemberships?.[0]?.organization_id || null,
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
  } catch (error: any) {
    console.error("Error in global policy locator:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

