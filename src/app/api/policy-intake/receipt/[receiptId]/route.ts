import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Get receipt data by receipt ID
 * Public endpoint - no authentication required
 * 
 * Fetches receipt information from the database using the receipt number.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;

    if (!receiptId) {
      return NextResponse.json(
        { error: "Receipt ID is required" },
        { status: 400 }
      );
    }

    // Fetch receipt from database
    const receipt = await prisma.$queryRawUnsafe<Array<{
      id: string;
      receipt_number: string;
      client_id: string;
      submission_id: string | null;
      created_at: Date;
    }>>(`
      SELECT 
        id, receipt_number, client_id, submission_id, created_at
      FROM receipts
      WHERE receipt_number = $1
      LIMIT 1
    `, receiptId);

    if (!receipt || receipt.length === 0) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    const receiptData = receipt[0];

    // Fetch submission data to get policy/client details
    let submissionData: Record<string, unknown> | null = null;
    if (receiptData.submission_id) {
      const submission = await prisma.$queryRawUnsafe<Array<{
        submitted_data: string;
        created_at: Date;
      }>>(`
        SELECT submitted_data, created_at
        FROM submissions
        WHERE id = $1
        LIMIT 1
      `, receiptData.submission_id);

      if (submission && submission.length > 0) {
        try {
          submissionData = JSON.parse(submission[0].submitted_data);
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    // Fetch client data
    const client = await prisma.$queryRawUnsafe<Array<{
      first_name: string;
      last_name: string;
      email: string;
    }>>(`
      SELECT first_name, last_name, email
      FROM clients
      WHERE id = $1
      LIMIT 1
    `, receiptData.client_id);

    // Fetch policy data
    const policy = await prisma.$queryRawUnsafe<Array<{
      policy_number: string | null;
      policy_type: string | null;
      insurer_id: string;
    }>>(`
      SELECT policy_number, policy_type, insurer_id
      FROM policies
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, receiptData.client_id);

    // Fetch insurer name
    let insurerName: string | null = null;
    if (policy && policy.length > 0 && policy[0].insurer_id) {
      const insurer = await prisma.$queryRawUnsafe<Array<{
        name: string;
      }>>(`
        SELECT name
        FROM insurers
        WHERE id = $1
        LIMIT 1
      `, policy[0].insurer_id);

      if (insurer && insurer.length > 0) {
        insurerName = insurer[0].name;
      }
    }

    // Extract data from submission or use database values
    const clientData = submissionData?.clientData || (client && client.length > 0 ? {
      firstName: client[0].first_name,
      lastName: client[0].last_name,
      email: client[0].email,
    } : null);

    const policyData = submissionData?.policyData || (policy && policy.length > 0 ? {
      policyNumber: policy[0].policy_number,
      policyType: policy[0].policy_type,
      insurerName: insurerName,
    } : null);

    return NextResponse.json({
      success: true,
      receiptId: receiptData.receipt_number,
      submittedAt: receiptData.created_at.toISOString(),
      decedentName: clientData 
        ? `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() 
        : null,
      policyNumber: policyData?.policyNumber || null,
      insurerName: policyData?.insurerName || null,
      // Note: QR token and QR code are not available for old policy-intake submissions
      // These are only available for the new registry-based intake system
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching receipt:", errorMessage);
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    );
  }
}

