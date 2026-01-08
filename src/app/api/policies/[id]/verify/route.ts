import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";
import { AuditAction } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

/**
 * Verify policy (attorney-only)
 * Updates verification status and notes
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await req.json();
    const { verificationStatus, verificationNotes } = body;

    if (!verificationStatus) {
      return NextResponse.json(
        { error: "Verification status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["PENDING", "VERIFIED", "DISCREPANCY", "INCOMPLETE", "REJECTED"];
    if (!validStatuses.includes(verificationStatus)) {
      return NextResponse.json(
        { error: "Invalid verification status" },
        { status: 400 }
      );
    }

    // Update policy verification
    const { update: updateDb } = await import("@/lib/db");
    const updateData: Record<string, unknown> = {
      verificationStatus,
      verificationNotes: verificationNotes || null,
      updatedAt: new Date().toISOString(),
    };
    
    // Only set verified_at and verified_by_user_id if status is not PENDING
    if (verificationStatus !== "PENDING") {
      updateData.verifiedAt = new Date().toISOString();
      updateData.verifiedByUserId = user.id;
    }
    
    await updateDb("policies", { id }, updateData);

    // Log audit event
    try {
      await logAuditEvent({
        action: AuditAction.POLICY_UPDATED,
        metadata: {
          policyId: id,
          message: `Policy verification status updated to ${verificationStatus}`,
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit event:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Verification status updated",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating verification:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to update verification" },
      { status: 500 }
    );
  }
}

