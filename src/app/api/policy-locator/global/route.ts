import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { randomUUID } from "crypto";
import type { Prisma, AuditAction } from "@prisma/client";

type PolicyLocatorResult = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  insurerName: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  beneficiaries: Array<{
    firstName: string;
    lastName: string;
    relationship: string | null;
  }>;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickAuditAction(): AuditAction {
  // You already used this elsewhere, so it should exist in your enum.
  // If TypeScript complains here, change it to a real enum member from your schema.
  return "GLOBAL_POLICY_SEARCH_PERFORMED" as AuditAction;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);

    const firstName = (searchParams.get("firstName") ?? "").trim();
    const lastName = (searchParams.get("lastName") ?? "").trim();
    const dateOfBirthParam = (searchParams.get("dateOfBirth") ?? "").trim();

    const policyNumberParam = (searchParams.get("policyNumber") ?? "").trim();
    const proofOfDeathCertNumber = (searchParams.get("proofOfDeathCertNumber") ?? "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const dateOfBirth = parseDate(dateOfBirthParam);

    // IMPORTANT: your prisma model is "clients" but its fields are camelCase,
    // and policy where input expects "policyNumber".
    const where: Prisma.clientsWhereInput = {
      firstName: { contains: firstName, mode: "insensitive" },
      lastName: { contains: lastName, mode: "insensitive" },
      ...(dateOfBirth ? { dateOfBirth } : {}),
      ...(policyNumberParam
        ? {
            policies: {
              some: {
                policyNumber: { contains: policyNumberParam, mode: "insensitive" },
              },
            },
          }
        : {}),
    };

    const clients = await prisma.clients.findMany({
      where,
      include: {
        policies: {
          include: {
            insurers: { select: { name: true } },
            policy_beneficiaries: {
              include: {
                beneficiaries: {
                  select: { firstName: true, lastName: true, relationship: true },
                },
              },
            },
          },
        },
      },
      take: 100,
    });

    const results: PolicyLocatorResult[] = clients.flatMap((client) =>
      client.policies.map((policy) => {
        const beneficiaries = policy.policy_beneficiaries.map((pb) => ({
          firstName: pb.beneficiaries.firstName,
          lastName: pb.beneficiaries.lastName,
          relationship: pb.beneficiaries.relationship,
        }));

        return {
          id: policy.id,
          policyNumber: policy.policyNumber ?? null,
          policyType: policy.policyType ?? null,
          insurerName: policy.insurers?.name ?? null,
          client: {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
          },
          beneficiaries,
        };
      })
    );

    // Audit log (best effort; does not block response)
    try {
      const member = await prisma.org_members.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });

      const action = pickAuditAction();

      await prisma.audit_logs.create({
        data: {
          id: randomUUID(),
          action,
          message: `Global policy search: ${firstName} ${lastName}${
            dateOfBirthParam ? ` (DOB: ${dateOfBirthParam})` : ""
          }${proofOfDeathCertNumber ? ` | Death Cert: ${proofOfDeathCertNumber}` : ""} | Results: ${
            results.length
          }`,
          userId: user.id, // NOTE: your audit_logs model likely uses snake field names; if TS errors, swap to userId.
          orgId: member?.organizationId ?? null, // same note: if TS errors, swap to orgId / organizationId per schema.
          createdAt: new Date(),
        },
      });
    } catch (auditError: unknown) {
      console.error("Failed to log global search audit:", auditError);
    }

    return NextResponse.json({
      policies: results,
      searchMetadata: {
        proofOfDeathCertNumber: proofOfDeathCertNumber || null,
        searchedBy: user.id,
        searchedAt: new Date().toISOString(),
        scope: "global",
      },
      disclaimer:
        "This search queries the private, voluntary registry database across all organizations. Results only include information that has been voluntarily registered. This is not a comprehensive database and does not search insurer records.",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = errorMessage === "Unauthorized" || errorMessage === "Forbidden";
    console.error("Error in global policy locator:", error);
    return NextResponse.json(
      { error: errorMessage || "Internal server error" },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
