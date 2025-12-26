import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const policy = await prisma.policies.findUnique({
      where: { id: policyId },
      select: { id: true, clientId: true },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // Ensure beneficiary exists and belongs to same client
    const beneficiary = await prisma.beneficiaries.findUnique({
      where: { id: beneficiaryId },
      select: { id: true, clientId: true },
    });

    if (!beneficiary || beneficiary.clientId !== policy.clientId) {
      return NextResponse.json(
        { error: "Beneficiary not found for this client" },
        { status: 400 }
      );
    }

    const existingLink = await prisma.policy_beneficiaries.findFirst({
      where: { policyId, beneficiaryId },
      select: { id: true },
    });

    if (existingLink) {
      return NextResponse.json({ ok: true, alreadyAttached: true });
    }

    await prisma.policy_beneficiaries.create({
      data: {
        id: randomUUID(),
        policyId,
        beneficiaryId,
        // DO NOT set createdAt/updatedAt if Prisma handles them
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to attach beneficiary" },
      { status: 400 }
    );
  }
}
