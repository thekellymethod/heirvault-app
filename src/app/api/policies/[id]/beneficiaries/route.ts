import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth("attorney");
    const policyId = params.id;

    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        clientId: true,
        beneficiaries: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            beneficiary: {
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

    const allClientBeneficiaries = await prisma.beneficiary.findMany({
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
      policy.beneficiaries.map((pb) => pb.beneficiary.id)
    );

    return NextResponse.json({
      attached: policy.beneficiaries.map((pb) => ({
        linkId: pb.id,
        attachedAt: pb.createdAt,
        beneficiaryId: pb.beneficiary.id,
        ...pb.beneficiary,
      })),
      available: allClientBeneficiaries.filter(
        (b) => !attachedIds.has(b.id)
      ),
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth("attorney");
    const policyId = params.id;
    const { beneficiaryId } = await req.json();

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "beneficiaryId is required" },
        { status: 400 }
      );
    }

    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { clientId: true },
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

    await prisma.policyBeneficiary.upsert({
      where: {
        policyId_beneficiaryId: {
          policyId,
          beneficiaryId,
        },
      },
      update: {},
      create: {
        policyId,
        beneficiaryId,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth("attorney");
    const policyId = params.id;
    const { beneficiaryId } = await req.json();

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: "beneficiaryId is required" },
        { status: 400 }
      );
    }

    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { clientId: true },
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

    await prisma.policyBeneficiary.deleteMany({
      where: { policyId, beneficiaryId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to detach beneficiary" },
      { status: 400 }
    );
  }
}
