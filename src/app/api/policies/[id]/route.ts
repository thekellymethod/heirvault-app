import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PolicyRecord = {
  id: string;
  orgId: string;
  registryId: string;
  [key: string]: unknown;
};

type OrgMemberRecord = {
  id: string;
  orgId: string;
  clerkUserId: string;
  role: string;
};

/**
 * Update policy
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);

    const { findUnique, update: updateDb, getDb } = await import("@/lib/db");
    const policy = await findUnique<PolicyRecord>("policies", { id });
    
    if (!policy) {
      return NextResponse.json(
        { ok: false, message: "Policy not found." },
        { status: 404 }
      );
    }

    // Check org membership - need to find by orgId and clerkUserId
    const db = getDb();
    const { data: members } = await db
      .from("org_members")
      .select("*")
      .eq("orgId", policy.orgId)
      .eq("clerkUserId", userId)
      .limit(1);
    
    const member = members && members.length > 0 ? (members[0] as OrgMemberRecord) : null;
    
    if (!member) {
      return NextResponse.json(
        { ok: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    // Build update data (only include fields that are provided)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (body?.carrier !== undefined) updateData.carrier = body.carrier?.trim() || null;
    if (body?.policyNumber !== undefined) updateData.policyNumber = body.policyNumber?.trim() || null;
    if (body?.insuredName !== undefined) updateData.insuredName = body.insuredName?.trim() || null;
    if (body?.ownerName !== undefined) updateData.ownerName = body.ownerName?.trim() || null;
    if (body?.beneficiary !== undefined) updateData.beneficiary = body.beneficiary?.trim() || null;
    if (body?.faceAmount !== undefined) updateData.faceAmount = body.faceAmount;
    if (body?.status !== undefined) updateData.status = body.status;
    if (body?.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    await updateDb("policies", { id: policy.id }, updateData);

    // Create audit log
    const { logAuditEvent } = await import("@/lib/audit");
    await logAuditEvent({
      userId: userId,
      action: "policy_update",
      metadata: {
        orgId: policy.orgId,
        registryId: policy.registryId,
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

    const { findUnique, deleteRecord, getDb } = await import("@/lib/db");
    const policy = await findUnique<PolicyRecord>("policies", { id });
    
    if (!policy) {
      return NextResponse.json(
        { ok: false, message: "Policy not found." },
        { status: 404 }
      );
    }

    // Check org membership and admin role
    const db = getDb();
    const { data: members } = await db
      .from("org_members")
      .select("*")
      .eq("orgId", policy.orgId)
      .eq("clerkUserId", userId)
      .limit(1);
    
    const member = members && members.length > 0 ? (members[0] as OrgMemberRecord) : null;
    
    if (!member || member.role !== "admin") {
      return NextResponse.json(
        { ok: false, message: "Admin required." },
        { status: 403 }
      );
    }

    await deleteRecord("policies", { id: policy.id });

    // Create audit log
    const { logAuditEvent } = await import("@/lib/audit");
    await logAuditEvent({
      userId: userId,
      action: "policy_delete",
      metadata: {
        orgId: policy.orgId,
        registryId: policy.registryId,
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
