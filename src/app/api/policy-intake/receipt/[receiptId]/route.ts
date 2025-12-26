import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type ReceiptRow = {
  id: string;
  receipt_number: string;
  clientId: string;
  submission_id: string | null;
  createdAt: Date;
};

type SubmissionRow = {
  submitted_data: string | null;
  createdAt: Date;
};

type ClientRow = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type PolicyRow = {
  policy_number: string | null;
  policy_type: string | null;
  insurer_id: string | null;
  carrier_name_raw: string | null;
  createdAt: Date;
};

type InsurerRow = {
  name: string | null;
};

const asRecord = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;

    const receipts = await prisma.$queryRawUnsafe<ReceiptRow[]>(
      `
      SELECT id, receipt_number, "clientId" as "clientId", submission_id, "createdAt"
      FROM receipts
      WHERE receipt_number = $1
      LIMIT 1
      `,
      receiptId
    );

    if (!receipts || receipts.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = receipts[0];

    // Submission (optional)
    let submissionObj: Record<string, unknown> | null = null;
    if (receipt.submission_id) {
      const subs = await prisma.$queryRawUnsafe<SubmissionRow[]>(
        `
        SELECT submitted_data, "createdAt"
        FROM submissions
        WHERE id = $1
        LIMIT 1
        `,
        receipt.submission_id
      );

      const raw = subs?.[0]?.submitted_data ?? null;
      if (raw) {
        try {
          submissionObj = asRecord(JSON.parse(raw));
        } catch {
          submissionObj = null;
        }
      }
    }

    const submissionClientData = asRecord(submissionObj?.clientData);
    const submissionPolicyData = asRecord(submissionObj?.policyData);

    // Client from DB
    const clients = await prisma.$queryRawUnsafe<ClientRow[]>(
      `
      SELECT "firstName", "lastName", email
      FROM clients
      WHERE id = $1
      LIMIT 1
      `,
      receipt.clientId
    );

    const clientRow = clients?.[0] ?? null;

    const firstName =
      (typeof submissionClientData?.firstName === "string" && submissionClientData.firstName) ||
      clientRow?.firstName ||
      "";

    const lastName =
      (typeof submissionClientData?.lastName === "string" && submissionClientData.lastName) ||
      clientRow?.lastName ||
      "";

    const email =
      (typeof submissionClientData?.email === "string" && submissionClientData.email) ||
      clientRow?.email ||
      null;

    // Policy at/before receipt time (keeps it historically consistent)
    const policies = await prisma.$queryRawUnsafe<PolicyRow[]>(
      `
      SELECT policy_number, policy_type, insurer_id, carrier_name_raw, "createdAt"
      FROM policies
      WHERE "clientId" = $1
        AND "createdAt" <= $2
      ORDER BY "createdAt" DESC
      LIMIT 1
      `,
      receipt.clientId,
      receipt.createdAt
    );

    const policyRow = policies?.[0] ?? null;

    const policyNumber =
      (typeof submissionPolicyData?.policyNumber === "string" && submissionPolicyData.policyNumber) ||
      policyRow?.policy_number ||
      null;

    const policyType =
      (typeof submissionPolicyData?.policyType === "string" && submissionPolicyData.policyType) ||
      policyRow?.policy_type ||
      null;

    let insurerName: string | null =
      (typeof submissionPolicyData?.insurerName === "string" && submissionPolicyData.insurerName) ||
      null;

    if (!insurerName) {
      if (policyRow?.insurer_id) {
        const insurers = await prisma.$queryRawUnsafe<InsurerRow[]>(
          `
          SELECT name
          FROM insurers
          WHERE id = $1
          LIMIT 1
          `,
          policyRow.insurer_id
        );
        insurerName = insurers?.[0]?.name ?? null;
      } else if (policyRow?.carrier_name_raw) {
        insurerName = policyRow.carrier_name_raw;
      }
    }

    return NextResponse.json({
      success: true,
      receiptId: receipt.receipt_number,
      submittedAt: receipt.createdAt.toISOString(),
      decedentName: `${firstName} ${lastName}`.trim() || null,
      email,
      policyNumber,
      policyType,
      insurerName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching policy-intake receipt:", message);
    return NextResponse.json({ error: "Failed to fetch receipt" }, { status: 500 });
  }
}
