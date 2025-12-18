import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("attorney");
    const { id: clientId } = await ctx.params;

    const access = await prisma.attorneyClientAccess.findFirst({
      where: { attorneyId: user.id, clientId, isActive: true },
      select: { id: true },
    });
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const policies = await prisma.policy.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        policyNumber: true,
        policyType: true,
        createdAt: true,
        insurer: { select: { id: true, name: true, website: true } },
        beneficiaries: { select: { id: true } },
      },
    });

    return NextResponse.json({
      policies: policies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        createdAt: p.createdAt,
        insurer: p.insurer,
        beneficiaryCount: p.beneficiaries.length,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth("attorney");
    const { id: clientId } = await ctx.params;

    const access = await prisma.attorneyClientAccess.findFirst({
      where: { attorneyId: user.id, clientId, isActive: true },
      select: { id: true },
    });
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const insurerId = body?.insurerId as string | undefined;
    const policyNumber = (body?.policyNumber as string | undefined) ?? null;
    const policyType = (body?.policyType as string | undefined) ?? null;

    if (!insurerId) {
      return NextResponse.json({ error: "insurerId is required" }, { status: 400 });
    }

    const policy = await prisma.policy.create({
      data: {
        clientId,
        insurerId,
        policyNumber,
        policyType,
      },
      select: {
        id: true,
        clientId: true,
        insurer: { select: { id: true, name: true } },
        policyNumber: true,
        policyType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
