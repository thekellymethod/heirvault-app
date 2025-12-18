import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET() {
  try {
    const user = await requireAuth("client");

    const client = await prisma.client.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    }

    const policies = await prisma.policy.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        policyNumber: true,
        policyType: true,
        createdAt: true,
        insurer: { select: { id: true, name: true } },
        beneficiaries: { select: { id: true } }, // count-ish
      },
    });

    return NextResponse.json(
      {
        policies: policies.map((p) => ({
          id: p.id,
          policyNumber: p.policyNumber,
          policyType: p.policyType,
          createdAt: p.createdAt,
          insurer: p.insurer,
          beneficiaryCount: p.beneficiaries.length,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("client");
    const body = await req.json();

    const client = await prisma.client.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    }

    const insurerId = (body?.insurerId as string | undefined)?.trim();
    const policyNumber = (body?.policyNumber as string | undefined)?.trim() || null;
    const policyType = (body?.policyType as string | undefined)?.trim() || null;

    if (!insurerId) {
      return NextResponse.json({ error: "insurerId is required" }, { status: 400 });
    }

    const insurer = await prisma.insurer.findUnique({
      where: { id: insurerId },
      select: { id: true },
    });
    if (!insurer) return NextResponse.json({ error: "Insurer not found" }, { status: 404 });

    const policy = await prisma.policy.create({
      data: {
        clientId: client.id,
        insurerId,
        policyNumber,
        policyType,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, policyId: policy.id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}
