import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";
import { randomUUID } from "crypto";

export async function GET(_req: NextRequest) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;

  try {
    // Get ALL beneficiaries globally - all attorneys can see all beneficiaries
    const beneficiariesList = await prisma.beneficiaries.findMany({
      include: {
        clients: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get policies for each beneficiary
    const beneficiaryIds = beneficiariesList.map(b => b.id);
    const policiesData = beneficiaryIds.length > 0
      ? await prisma.policy_beneficiaries.findMany({
          where: { beneficiaryId: { in: beneficiaryIds } },
          include: {
            policies: {
              include: {
                insurers: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })
      : [];

    // Combine beneficiaries with their policies
    const beneficiariesWithPolicies = beneficiariesList.map(b => {
      const beneficiaryPolicies = policiesData
        .filter(p => p.beneficiaryId === b.id)
        .map(p => ({
          id: p.policies.id,
          policyNumber: p.policies.policyNumber,
          policyType: p.policies.policyType,
          // Handle null insurer from leftJoin - return null instead of { name: null }
          insurer: p.policies.insurers?.name ? { name: p.policies.insurers.name } : null,
        }));

      return {
        ...b,
        client: {
          id: b.clients.id,
          firstName: b.clients.firstName,
          lastName: b.clients.lastName,
          email: b.clients.email,
        },
        policies: beneficiaryPolicies,
      };
    });

    return NextResponse.json(beneficiariesWithPolicies);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to fetch beneficiaries";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    const body = await req.json();

    const {
      clientId,
      firstName,
      lastName,
      relationship,
      email,
      phone,
      dateOfBirth,
    } = body;

    if (!clientId || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, firstName, and lastName are required" },
        { status: 400 }
      );
    }

    // All attorneys can create beneficiaries for any client (global access)
    const clientExists = await prisma.clients.findFirst({
      where: { id: clientId },
      select: { id: true },
    });

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const beneficiaryId = randomUUID();
    const now = new Date();
    const dateOfBirthValue = dateOfBirth 
      ? (typeof dateOfBirth === 'string' 
          ? new Date(dateOfBirth.slice(0, 10)) 
          : new Date(dateOfBirth))
      : null;

    const beneficiary = await prisma.beneficiaries.create({
      data: {
        id: beneficiaryId,
        clientId: clientId,
        firstName: firstName,
        lastName: lastName,
        relationship: relationship || null,
        email: email ?? null,
        phone: phone ?? null,
        dateOfBirth: dateOfBirthValue,
        createdAt: now,
        updatedAt: now,
      },
    });

    await logAuditEvent({
      action: "BENEFICIARY_CREATED",
      resourceType: "beneficiary",
      resourceId: beneficiaryId,
      details: { clientId, firstName, lastName },
      userId: user.id,
    });

    return NextResponse.json(beneficiary, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to create beneficiary";
    console.error("Error creating beneficiary:", error);
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
