// src/app/api/policy-intake/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type ClientData = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null; // ISO date string from form input
};

type PolicyData = {
  policyNumber?: string | null;
  policyType?: string | null;
  insurerName?: string | null;
};

type IntakeBody = {
  clientData?: ClientData;
  policyData?: PolicyData;
  raw?: unknown;
};

// IMPORTANT: Your queryRaw<T>() appears to already return T[].
// So the generic MUST be the *row type*, not an array type.
// i.e. queryRaw<Row>(...) -> Promise<Row[]>

type ClientIdRow = { id: string };

type InsurerRow = { id: string; name: string | null };

type PolicyRow = {
  id: string;
  clientId: string;
  policy_number: string | null;
  policy_type: string | null;
  insurer_id: string | null;
  carrier_name_raw: string | null;
  createdAt: Date;
};

type ClientRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  createdAt: Date;
};

type ReceiptRow = {
  id: string;
  receipt_number: string;
  clientId: string;
  submission_id: string | null;
  createdAt: Date;
};

type SubmissionRow = { id: string; submitted_data: string | null; createdAt: Date };

const norm = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
};

const safeISODate = (v: unknown): Date | null => {
  const s = norm(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IntakeBody;

    const clientData: ClientData = body?.clientData ?? {};
    const policyData: PolicyData = body?.policyData ?? {};

    const firstName = norm(clientData.firstName) ?? "";
    const lastName = norm(clientData.lastName) ?? "";
    const email = norm(clientData.email);
    const phone = norm(clientData.phone);
    const dateOfBirth = safeISODate(clientData.dateOfBirth);

    const policyNumber = norm(policyData.policyNumber);
    const policyType = norm(policyData.policyType);
    const insurerNameInput = norm(policyData.insurerName);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { queryRaw } = await import("@/lib/db");

    // ------------------------------------------------------------
    // 1) Find-or-create client (by email)
    // ------------------------------------------------------------
    const existingClients = await queryRaw<ClientIdRow>(
      `
      SELECT id
      FROM clients
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    const existingClient = existingClients?.[0] ?? null;
    let clientId: string;

    if (!existingClient?.id) {
      const newClientId = randomUUID();

      await queryRaw(
        `
        INSERT INTO clients (
          id,
          "firstName",
          "lastName",
          email,
          phone,
          "dateOfBirth",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
        `,
        [newClientId, firstName || null, lastName || null, email, phone, dateOfBirth]
      );

      clientId = newClientId;
    } else {
      clientId = existingClient.id;

      // keep record fresh (optional)
      await queryRaw(
        `
        UPDATE clients
        SET
          "firstName" = COALESCE(NULLIF($2,''), "firstName"),
          "lastName"  = COALESCE(NULLIF($3,''), "lastName"),
          phone       = COALESCE($4, phone),
          "dateOfBirth" = COALESCE($5, "dateOfBirth"),
          "updatedAt" = NOW()
        WHERE id = $1
        `,
        [clientId, firstName, lastName, phone, dateOfBirth]
      );
    }

    // ------------------------------------------------------------
    // 2) Resolve insurer (optional)
    // ------------------------------------------------------------
    let insurerId: string | null = null;
    let carrierNameRaw: string | null = null;

    if (insurerNameInput) {
      const insurers = await queryRaw<InsurerRow>(
        `
        SELECT id, name
        FROM insurers
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
        `,
        [insurerNameInput]
      );

      const insurer = insurers?.[0] ?? null;

      if (insurer?.id) {
        insurerId = insurer.id;
      } else {
        // “lazy insurers” mode: don't create insurer rows automatically
        carrierNameRaw = insurerNameInput;
      }
    }

    // ------------------------------------------------------------
    // 3) Create policy row (optional)
    // ------------------------------------------------------------
    let policyId: string | null = null;

    if (policyNumber || policyType || insurerId || carrierNameRaw) {
      policyId = randomUUID();

      await queryRaw(
        `
        INSERT INTO policies (
          id,
          "clientId",
          policy_number,
          policy_type,
          insurer_id,
          carrier_name_raw,
          "createdAt",
          "updatedAt"
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
        `,
        [policyId, clientId, policyNumber, policyType, insurerId, carrierNameRaw]
      );
    }

    // ------------------------------------------------------------
    // 4) Store submission payload
    // ------------------------------------------------------------
    const submissionId = randomUUID();

    const submittedPayload = {
      clientData: {
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        phone,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
      },
      policyData: {
        policyNumber,
        policyType,
        insurerName: insurerNameInput,
      },
      raw: body?.raw ?? body ?? null,
      clientId,
      policyId,
      submittedAt: new Date().toISOString(),
    };

    await queryRaw(
      `
      INSERT INTO submissions (
        id,
        submitted_data,
        "createdAt"
      )
      VALUES ($1,$2,NOW())
      `,
      [submissionId, JSON.stringify(submittedPayload)]
    );

    // ------------------------------------------------------------
    // 5) Create receipt
    // ------------------------------------------------------------
    const receiptRowId = randomUUID();
    const receiptNumber = `REC-${clientId}-${Date.now()}`;

    await queryRaw(
      `
      INSERT INTO receipts (
        id,
        receipt_number,
        "clientId",
        submission_id,
        "createdAt"
      )
      VALUES ($1,$2,$3,$4,NOW())
      `,
      [receiptRowId, receiptNumber, clientId, submissionId]
    );

    // ------------------------------------------------------------
    // 6) Fetch created records for response (arrays -> single rows)
    // ------------------------------------------------------------
    const receipts = await queryRaw<ReceiptRow>(
      `
      SELECT id, receipt_number, "clientId", submission_id, "createdAt"
      FROM receipts
      WHERE id = $1
      LIMIT 1
      `,
      [receiptRowId]
    );
    const receipt = receipts?.[0] ?? null;

    const clients = await queryRaw<ClientRow>(
      `
      SELECT id, "firstName", "lastName", email, phone, "dateOfBirth", "createdAt"
      FROM clients
      WHERE id = $1
      LIMIT 1
      `,
      [clientId]
    );
    const client = clients?.[0] ?? null;

    const policies = policyId
      ? await queryRaw<PolicyRow>(
          `
          SELECT
            id,
            "clientId" as "clientId",
            policy_number,
            policy_type,
            insurer_id,
            carrier_name_raw,
            "createdAt"
          FROM policies
          WHERE id = $1
          LIMIT 1
          `,
          [policyId]
        )
      : [];
    const policy = policies?.[0] ?? null;

    // ------------------------------------------------------------
    // 7) Final insurerName for response
    // ------------------------------------------------------------
    let insurerName: string | null = insurerNameInput ?? null;

    if (!insurerName && policy?.insurer_id) {
      const insurers = await queryRaw<InsurerRow>(
        `
        SELECT id, name
        FROM insurers
        WHERE id = $1
        LIMIT 1
        `,
        [policy.insurer_id]
      );
      insurerName = insurers?.[0]?.name ?? null;
    }

    if (!insurerName && policy?.carrier_name_raw) {
      insurerName = policy.carrier_name_raw;
    }

    return NextResponse.json({
      success: true,
      receiptId: receipt?.receipt_number ?? receiptNumber,
      submittedAt: (receipt?.createdAt ?? new Date()).toISOString(),
      client: {
        id: clientId,
        firstName: client?.firstName ?? firstName ?? null,
        lastName: client?.lastName ?? lastName ?? null,
        email: client?.email ?? email,
        phone: client?.phone ?? phone,
        dateOfBirth: (client?.dateOfBirth ?? dateOfBirth)?.toISOString?.() ?? null,
      },
      policy: policy
        ? {
            id: policy.id,
            policyNumber: policy.policy_number,
            policyType: policy.policy_type,
            insurerName,
          }
        : null,
      submissionId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("policy-intake submit error:", message);
    return NextResponse.json({ error: "Failed to submit intake" }, { status: 500 });
  }
}
