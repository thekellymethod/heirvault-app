import { NextRequest, NextResponse } from "next/server";
;
import { requireAuthApi } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;

  try {
    const { searchParams } = new URL(req.url);
    const { parsePaginationParams, createPaginationResponse } = await import("@/lib/api/pagination");
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const { count, findMany: findManyDb, getDb } = await import("@/lib/db");
    const db = getDb();
    
    // Get total count
    const totalCount = await count("beneficiaries", {});

    // Get ALL beneficiaries globally - all attorneys can see all beneficiaries with pagination
    const beneficiariesList = await findManyDb("beneficiaries", {
      orderBy: { column: "createdAt", ascending: false },
      limit,
      offset: skip,
    });

    // Fetch clients for beneficiaries
    const clientIds = [...new Set((beneficiariesList as any[]).map((b: any) => b.clientId))];
    const clients = clientIds.length > 0
      ? await findManyDb("clients", {
          where: { id: { in: clientIds } as any },
        })
      : [];
    const clientsMap = new Map((clients as any[]).map((c: any) => [c.id, c]));

    // Get policies for each beneficiary
    const beneficiaryIds = (beneficiariesList as any[]).map((b: any) => b.id);
    const policiesData = beneficiaryIds.length > 0
      ? await findManyDb("policy_beneficiaries", {
          where: { beneficiaryId: { in: beneficiaryIds } as any },
        })
      : [];

    // Fetch policies and insurers
    const policyIds = [...new Set((policiesData as any[]).map((p: any) => p.policyId))];
    const policies = policyIds.length > 0
      ? await findManyDb("policies", {
          where: { id: { in: policyIds } as any },
        })
      : [];
    const policiesMap = new Map((policies as any[]).map((p: any) => [p.id, p]));

    const insurerIds = [...new Set((policies as any[]).map((p: any) => p.insurerId).filter(Boolean))];
    const insurers = insurerIds.length > 0
      ? await findManyDb("insurers", {
          where: { id: { in: insurerIds } as any },
        })
      : [];
    const insurersMap = new Map((insurers as any[]).map((i: any) => [i.id, i]));

    // Combine beneficiaries with their policies
    const beneficiariesWithPolicies = (beneficiariesList as any[]).map((b: any) => {
      const client = clientsMap.get(b.clientId);
      const beneficiaryPolicies = (policiesData as any[])
        .filter((p: any) => p.beneficiaryId === b.id)
        .map((p: any) => {
          const policy = policiesMap.get(p.policyId);
          if (!policy) return null;
          const insurer = policy.insurerId ? insurersMap.get(policy.insurerId) : null;
          return {
            id: policy.id,
            policyNumber: policy.policyNumber,
            policyType: policy.policyType,
            insurer: insurer?.name ? { name: insurer.name } : null,
          };
        })
        .filter(Boolean);

      return {
        ...b,
        client: client ? {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
        } : null,
        policies: beneficiaryPolicies,
      };
    });

    const response = createPaginationResponse(beneficiariesWithPolicies, totalCount, page, limit);
    return NextResponse.json(response);
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
    const { findUnique, create: createDb } = await import("@/lib/db");
    const { AuditAction } = await import("@/lib/db/enums");
    
    const clientExists = await findUnique("clients", { id: clientId });

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

    const beneficiary = await createDb("beneficiaries", {
      id: beneficiaryId,
      clientId: clientId,
      firstName: firstName,
      lastName: lastName,
      relationship: relationship || null,
      email: email ?? null,
      phone: phone ?? null,
      dateOfBirth: dateOfBirthValue ? dateOfBirthValue.toISOString() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as any);

    await logAuditEvent({
      action: AuditAction.BENEFICIARY_CREATED,
      userId: user.id,
      clientId: clientId,
      metadata: { beneficiaryId, firstName, lastName },
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
