import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Update policy
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);

    const policy = await prisma.policy.findUnique({
      where: { id },
      select: { id: true, orgId: true, registryId: true },
    });
    
    if (!policy) {
      return NextResponse.json(
        { ok: false, message: "Policy not found." },
        { status: 404 }
      );
    }

    const member = await prisma.orgMember.findUnique({
      where: { orgId_clerkUserId: { orgId: policy.orgId, clerkUserId: userId } },
      select: { role: true },
    });
    
    if (!member) {
      return NextResponse.json(
        { ok: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    await prisma.policy.update({
      where: { id: policy.id },
      data: {
        carrier: body?.carrier !== undefined ? (body.carrier?.trim() || null) : undefined,
        policyNumber: body?.policyNumber !== undefined ? (body.policyNumber?.trim() || null) : undefined,
        insuredName: body?.insuredName !== undefined ? (body.insuredName?.trim() || null) : undefined,
        ownerName: body?.ownerName !== undefined ? (body.ownerName?.trim() || null) : undefined,
        beneficiary: body?.beneficiary !== undefined ? (body.beneficiary?.trim() || null) : undefined,
        faceAmount: body?.faceAmount !== undefined ? (body.faceAmount || null) : undefined,
        status: body?.status !== undefined ? body.status : undefined,
        notes: body?.notes !== undefined ? (body.notes?.trim() || null) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId: policy.orgId,
        registryId: policy.registryId,
        actorClerkUserId: userId,
        action: "policy_update",
        targetType: "policy",
        targetId: policy.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in policy PATCH route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof Error && error.message === "UNAUTHENTICATED"
      ? 401
      : 500;
    return NextResponse.json(
      { ok: false, message },
      { status }
    );
  }
}

/**
 * Delete policy (admin only)
 */
export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = await requireUserId();

    const policy = await prisma.policy.findUnique({
      where: { id },
      select: { id: true, orgId: true, registryId: true },
    });
    
    if (!policy) {
      return NextResponse.json(
        { ok: false, message: "Policy not found." },
        { status: 404 }
      );
    }

    const member = await prisma.orgMember.findUnique({
      where: { orgId_clerkUserId: { orgId: policy.orgId, clerkUserId: userId } },
      select: { role: true },
    });
    
    if (!member || member.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Admin required." },
        { status: 403 }
      );
    }

    await prisma.policy.delete({ where: { id: policy.id } });

    await prisma.auditLog.create({
      data: {
        orgId: policy.orgId,
        registryId: policy.registryId,
        actorClerkUserId: userId,
        action: "policy_delete",
        targetType: "policy",
        targetId: policy.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in policy DELETE route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof Error && error.message === "UNAUTHENTICATED"
      ? 401
      : 500;
    return NextResponse.json(
      { ok: false, message },
      { status }
    );
  }
}
