import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth("attorney");
    const { id: policyId } = await params;

    const policy = await prisma.policies.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        client_id: true,
        policy_beneficiaries: {
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            created_at: true,
            beneficiaries: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                relationship: true,
                email: true,
                phone: true,
                date_of_birth: true,
              },
            },
          },
        },
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const access = await prisma.attorney_client_access.findFirst({
      where: {
        attorney_id: user.id,
        client_id: policy.client_id,
        is_active: true,
      },
      select: { id: true },
    });

    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allClientBeneficiaries = await prisma.beneficiaries.findMany({
      where: { client_id: policy.client_id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        relationship: true,
        email: true,
        phone: true,
        date_of_birth: true,
        created_at: true,
      },
    });

    const attachedIds = new Set(
      policy.policy_beneficiaries.map((pb) => pb.beneficiaries.id)
    );

    return NextResponse.json({
      attached: policy.policy_beneficiaries.map((pb) => ({
        linkId: pb.id,
        attachedAt: pb.created_at,
        beneficiaryId: pb.beneficiaries.id,
        id: pb.beneficiaries.id,
        firstName: pb.beneficiaries.first_name,
        lastName: pb.beneficiaries.last_name,
        relationship: pb.beneficiaries.relationship,
        email: pb.beneficiaries.email,
        phone: pb.beneficiaries.phone,
        dateOfBirth: pb.beneficiaries.date_of_birth,
      })),
      available: allClientBeneficiaries
        .filter((b) => !attachedIds.has(b.id))
        .map((b) => ({
          id: b.id,
          firstName: b.first_name,
          lastName: b.last_name,
          relationship: b.relationship,
          email: b.email,
          phone: b.phone,
          dateOfBirth: b.date_of_birth,
          createdAt: b.created_at,
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
    const user = await requireAuth("attorney");
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
      select: { client_id: true },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // All attorneys have global access - just verify policy exists
    // (already checked above)

    const existingLink = await prisma.policy_beneficiaries.findFirst({
      where: {
        policy_id: policyId,
        beneficiary_id: beneficiaryId,
      },
    });

    if (!existingLink) {
      await prisma.policy_beneficiaries.create({
        data: {
          id: randomUUID(),
          policy_id: policyId,
          beneficiary_id: beneficiaryId,
          share_percentage: null,
          created_at: new Date(),
          updated_at: new Date(),
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
    const user = await requireAuth("attorney");
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
      select: { client_id: true },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // All attorneys have global access - just verify policy exists
    // (already checked above)

    await prisma.policy_beneficiaries.deleteMany({
      where: { policy_id: policyId, beneficiary_id: beneficiaryId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to detach beneficiary" },
      { status: 400 }
    );
  }
}
