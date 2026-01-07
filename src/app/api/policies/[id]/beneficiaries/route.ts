import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: policyId } = await params;

    const { beneficiaryId } = (await req.json()) as { beneficiaryId?: string };

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "beneficiaryId is required" },
        { status: 400 }
      );
    }

    const { findUnique, findMany, create: createDb } = await import("@/lib/db");
    
    type PolicyRecord = {
      id: string;
      clientId: string;
    };
    
    type BeneficiaryRecord = {
      id: string;
      clientId: string;
    };

    const policy = await findUnique<PolicyRecord>("policies", { id: policyId });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // Ensure beneficiary exists and belongs to same client
    const beneficiary = await findUnique<BeneficiaryRecord>("beneficiaries", { id: beneficiaryId });

    if (!beneficiary || beneficiary.clientId !== policy.clientId) {
      return NextResponse.json(
        { error: "Beneficiary not found for this client" },
        { status: 400 }
      );
    }

    const existingLinks = await findMany("policy_beneficiaries", {
      where: { policyId, beneficiaryId },
      limit: 1,
    });

    if (existingLinks && existingLinks.length > 0) {
      return NextResponse.json({ ok: true, alreadyAttached: true });
    }

    await createDb("policy_beneficiaries", {
      id: randomUUID(),
      policyId,
      beneficiaryId,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to attach beneficiary" },
      { status: 400 }
    );
  }
}
