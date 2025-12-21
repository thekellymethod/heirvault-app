import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { AuditActionEnum } from "@/lib/db";
import { audit } from "@/lib/audit";

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
    const { userId } = await requireAuth();
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
    await prisma.$executeRawUnsafe(`
      UPDATE policies
      SET 
        verification_status = $2,
        verified_at = CASE WHEN $2 != 'PENDING' THEN NOW() ELSE verified_at END,
        verified_by_user_id = CASE WHEN $2 != 'PENDING' THEN $3 ELSE verified_by_user_id END,
        verification_notes = $4,
        updated_at = NOW()
      WHERE id = $1
    `,
      id,
      verificationStatus,
      userId,
      verificationNotes || null
    );

    // Log audit event
    try {
      await audit(AuditActionEnum.POLICY_UPDATED, {
        policyId: id,
        message: `Policy verification status updated to ${verificationStatus}`,
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

