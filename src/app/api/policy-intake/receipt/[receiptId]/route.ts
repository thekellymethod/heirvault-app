// src/app/api/policy-intake/receipt/[receiptId]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// NOTE: queryRaw<Row>() returns Row[] (NOT Row[][]).
// So the generic must be the ROW TYPE, not Row[].

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

    const { queryRaw } = await import("@/lib/db");

    // 1) Receipt
    const receipts = await queryRaw<ReceiptRow>(
      `
      SELECT
        id,
        receipt_number,
        "clientId" as "clientId",
        submission_id,
        "createdAt"
      FROM receipts
      WHERE receipt_number = $1
      LIMIT 1
      `,
      [receiptId]
    );

    const receipt = receipts?.[0] ?? null;

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // 2) Submission (optional)
    let submissionObj: Record<string, unknown> | null = null;

    if (receipt.submission_id) {
      const subs = await queryRaw<SubmissionRow>(
        `
        SELECT submitted_data, "createdAt"
        FROM submissions
        WHERE id = $1
        LIMIT 1
        `,
        [receipt.submission_id]
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

    // 3) Client
    const clients = await queryRaw<ClientRow>(
      `
      SELECT "firstName", "lastName", email
      FROM clients
      WHERE id = $1
      LIMIT 1
      `,
      [receipt.clientId]
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

    // 4) Policy at/before receipt time (historically consistent)
    const policies = await queryRaw<PolicyRow>(
      `
      SELECT policy_number, policy_type, insurer_id, carrier_name_raw, "createdAt"
      FROM policies
      WHERE "clientId" = $1
        AND "createdAt" <= $2
      ORDER BY "createdAt" DESC
      LIMIT 1
      `,
      [receipt.clientId, receipt.createdAt]
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

    // 5) Insurer name
    let insurerName: string | null =
      (typeof submissionPolicyData?.insurerName === "string" && submissionPolicyData.insurerName) ||
      null;

    if (!insurerName) {
      if (policyRow?.insurer_id) {
        const insurers = await queryRaw<InsurerRow>(
          `
          SELECT name
          FROM insurers
          WHERE id = $1
          LIMIT 1
          `,
          [policyRow.insurer_id]
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
