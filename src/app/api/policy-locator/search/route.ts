import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserWithOrg } from "@/lib/authz";

export async function GET(req: NextRequest) {
  try {
    const { user, orgMember } = await getCurrentUserWithOrg();

    if (!user || !orgMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Build search query
    const where: any = {
      orgId: orgMember.organizationId,
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

    if (ssn) {
      // Note: SSN would need to be stored in the database schema
      // For now, we'll skip this filter if SSN field doesn't exist
    }

    if (address) {
      // Note: Address would need to be stored in the database schema
      // For now, we'll skip this filter if address field doesn't exist
    }

    // Search for clients matching the criteria
    const clients = await prisma.client.findMany({
      where,
      include: {
        policies: {
          include: {
            insurer: true,
          },
          where: policyNumber
            ? {
                policyNumber: {
                  contains: policyNumber,
                  mode: "insensitive",
                },
              }
            : undefined,
        },
      },
    });

    // Filter results to only include clients with policies
    const results = clients
      .filter((client) => client.policies.length > 0)
      .map((client) => {
        // Return the first policy (or you could return all policies)
        const policy = client.policies[0];
        return {
          id: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          policyNumber: policy.policyNumber,
          policyType: policy.policyType,
          insurerName: policy.insurer.name,
          dateOfBirth: client.dateOfBirth,
          dateOfDeath: null, // This would need to be added to the schema if needed
        };
      });

    // Log the policy search for audit purposes (internal audit log, not visible to users)
    try {
      await prisma.auditLog.create({
        data: {
          action: "POLICY_SEARCH_PERFORMED",
          message: `Policy search: ${firstName} ${lastName}${dateOfBirth ? ` (DOB: ${dateOfBirth})` : ""}${policyNumber ? ` | Policy #: ${policyNumber}` : ""} | Results: ${results.length} policy(ies)`,
          userId: user.id,
          orgId: orgMember.organizationId,
        },
      });
    } catch (auditError) {
      console.error("Failed to log policy search audit:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error in policy locator search:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

