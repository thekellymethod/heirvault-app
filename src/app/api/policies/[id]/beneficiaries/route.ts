import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: policyId } = await params;

    const policy = await prisma.policies.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        clientId: true,
        policy_beneficiaries: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            beneficiaries: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                relationship: true,
                email: true,
                phone: true,
                dateOfBirth: true,
              },
            },
          },
        },
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const access = await prisma.attorneyClientAccess.findFirst({
      where: {
        attorneyId: user.id,
        clientId: policy.clientId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allClientBeneficiaries = await prisma.beneficiaries.findMany({
      where: { clientId: policy.clientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        relationship: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    const attachedIds = new Set(
      policy.policy_beneficiaries.map((pb) => pb.beneficiaries.id)
    );

    return NextResponse.json({
      attached: policy.policy_beneficiaries.map((pb) => ({
        linkId: pb.id,
        attachedAt: pb.createdAt,
        beneficiaryId: pb.beneficiaries.id,
        id: pb.beneficiaries.id,
        firstName: pb.beneficiaries.firstName,
        lastName: pb.beneficiaries.lastName,
        relationship: pb.beneficiaries.relationship,
        email: pb.beneficiaries.email,
        phone: pb.beneficiaries.phone,
        dateOfBirth: pb.beneficiaries.dateOfBirth,
      })),
      available: allClientBeneficiaries
        .filter((b) => !attachedIds.has(b.id))
        .map((b) => ({
          id: b.id,
          firstName: b.firstName,
          lastName: b.lastName,
          relationship: b.relationship,
          email: b.email,
          phone: b.phone,
          dateOfBirth: b.dateOfBirth,
          createdAt: b.createdAt,
        })),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch beneficiaries" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: policyId } = await params;
    const { beneficiaryId } = await req.json();

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "beneficiaryId is required" },
        { status: 400 }
      );
    }

    const policy = await prisma.policies.findUnique({
      where: { id: policyId },
      select: { clientId: true },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // All attorneys have global access - just verify policy exists
    // (already checked above)

    const existingLink = await prisma.policy_beneficiaries.findFirst({
      where: {
        policyId: policyId,
        beneficiaryId: beneficiaryId,
      },
    });

    if (!existingLink) {
      await prisma.policy_beneficiaries.create({
        data: {
          id: randomUUID(),
          policyId: policyId,
          beneficiaryId: beneficiaryId,
          sharePercentage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to attach beneficiary" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: policyId } = await params;
    const { beneficiaryId } = await req.json();

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "beneficiaryId is required" },
        { status: 400 }
      );
    }

    const policy = await prisma.policies.findUnique({
      where: { id: policyId },
      select: { clientId: true },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // All attorneys have global access - just verify policy exists
    // (already checked above)

    await prisma.policy_beneficiaries.deleteMany({
      where: { policyId: policyId, beneficiaryId: beneficiaryId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to detach beneficiary" },
      { status: 400 }
    );
  }
}
