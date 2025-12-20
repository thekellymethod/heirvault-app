import { NextRequest, NextResponse } from "next/server";
import { db, beneficiaries, clients, policyBeneficiaries, policies, insurers, eq, desc, sql, inArray } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    // Get ALL beneficiaries globally - all attorneys can see all beneficiaries
    const beneficiariesList = await db.select({
      beneficiary: beneficiaries,
      client: {
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
      },
    })
      .from(beneficiaries)
      .innerJoin(clients, eq(beneficiaries.clientId, clients.id))
      .orderBy(desc(beneficiaries.createdAt));

    // Get policies for each beneficiary
    const beneficiaryIds = beneficiariesList.map(b => b.beneficiary.id);
    const policiesData = beneficiaryIds.length > 0
      ? await db.select({
          beneficiaryId: policyBeneficiaries.beneficiaryId,
          policy: {
            id: policies.id,
            policyNumber: policies.policyNumber,
            policyType: policies.policyType,
          },
          insurer: {
            name: insurers.name,
          },
        })
          .from(policyBeneficiaries)
          .innerJoin(policies, eq(policyBeneficiaries.policyId, policies.id))
          .innerJoin(insurers, eq(policies.insurerId, insurers.id))
          .where(inArray(policyBeneficiaries.beneficiaryId, beneficiaryIds))
      : [];

    // Combine beneficiaries with their policies
    const beneficiariesWithPolicies = beneficiariesList.map(b => {
      const beneficiaryPolicies = policiesData
        .filter(p => p.beneficiaryId === b.beneficiary.id)
        .map(p => ({
          id: p.policy.id,
          policyNumber: p.policy.policyNumber,
          policyType: p.policy.policyType,
          insurer: {
            name: p.insurer.name,
          },
        }));

      return {
        ...b.beneficiary,
        client: b.client,
        policies: beneficiaryPolicies,
      };
    });

    return NextResponse.json(beneficiariesWithPolicies);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unable to fetch beneficiaries" },
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
    const [clientExists] = await db.select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [beneficiary] = await db.insert(beneficiaries)
      .values({
        clientId,
        firstName,
        lastName,
        relationship: relationship || null,
        email: email ?? null,
        phone: phone ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      })
      .returning();

    await logAuditEvent({
      action: "BENEFICIARY_CREATED",
      message: "Beneficiary created",
      userId: user.id,
      clientId,
    });

    return NextResponse.json(beneficiary, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to create beneficiary" },
      { status: 400 }
    );
  }
}
