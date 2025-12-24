// src/app/api/invite/[token]/upload-policy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/lib/db/enums";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { sendAttorneyNotificationEmail, sendClientReceiptEmail } from "@/lib/email";
import { extractPolicyData } from "@/lib/ocr";
import { uploadDocument } from "@/lib/storage";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";
import { generateDocumentHash } from "@/lib/document-hash";

export const runtime = "nodejs";

type RouteParams = Promise<{ token: string }>;

type InviteLookupResult =
  | Awaited<ReturnType<typeof getOrCreateTestInvite>>
  | Awaited<ReturnType<typeof lookupClientInvite>>;

type ExtractedPolicyData = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  policyNumber: string | null;
  policyType: string | null;
  insurerName: string | null;
  insurerPhone: string | null;
  insurerEmail: string | null;
};

type DocumentRow = {
  id: string;
  client_id: string;
  policy_id: string | null;
  extracted_data: unknown | null;
  ocr_confidence: number | null;
};

type PolicyRow = {
  id: string;
  policy_number: string | null;
  policy_type: string | null;
  carrier_name_raw: string | null;
  insurer_name: string | null;
  insurer_contact_phone: string | null;
  insurer_contact_email: string | null;
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: Date | null;
  created_at: Date;
};

type AttorneyAccessRow = {
  attorney_id: string;
  attorney_email: string;
  attorney_first_name: string | null;
  attorney_last_name: string | null;
  org_id: string;
  org_name: string;
  org_address_line1: string | null;
  org_address_line2: string | null;
  org_city: string | null;
  org_state: string | null;
  org_postal_code: string | null;
  org_phone: string | null;
};

type ArchivedDocument = {
  id: string;
  clientId: string;
  policyId: string | null;
  fileName?: string;
};

function safeJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Failed to parse JSON");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  const maybeWeb = stream as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };

  if (typeof maybeWeb?.getReader === "function") {
    const reader = maybeWeb.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  const nodeStream = stream as NodeJS.ReadableStream;
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    nodeStream.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    nodeStream.on("end", () => resolve(Buffer.concat(chunks)));
    nodeStream.on("error", reject);
  });
}

const VALID_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"] as const;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function validateUploadFile(file: File) {
  if (!VALID_TYPES.includes(file.type as (typeof VALID_TYPES)[number])) {
    throw new Error("Invalid file type. Please upload a PDF or image file.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File size must be less than 10MB");
  }
}

export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    const { token } = await params;

    let invite: InviteLookupResult | null = await getOrCreateTestInvite(token);
    if (!invite) invite = await lookupClientInvite(token);

    if (!invite) {
      return NextResponse.json({ error: "Invalid invitation code" }, { status: 404 });
    }

    const now = new Date();
    const daysSinceExpiration =
      (now.getTime() - invite.expiresAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceExpiration > 30) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Payload (JSON or FormData)
    let file: File | null = null;
    let policyDataRaw: string | null = null;
    let changeRequest: string | null = null;
    let clientDataRaw: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        clientData?: Record<string, unknown>;
        policyData?: Record<string, unknown>;
      };
      clientDataRaw = JSON.stringify(body.clientData || {});
      policyDataRaw = JSON.stringify(body.policyData || {});
    } else {
      const formData = await req.formData();
      const fdFile = formData.get("file");
      file = fdFile instanceof File ? fdFile : null;
      policyDataRaw = typeof formData.get("policyData") === "string" ? (formData.get("policyData") as string) : null;
      changeRequest = typeof formData.get("changeRequest") === "string" ? (formData.get("changeRequest") as string) : null;
      clientDataRaw = typeof formData.get("clientData") === "string" ? (formData.get("clientData") as string) : null;
    }

    const isChangeRequest = !!changeRequest;

    if (!file && !policyDataRaw && !isChangeRequest) {
      return NextResponse.json({ error: "Policy file or data is required" }, { status: 400 });
    }

    let extractedData: ExtractedPolicyData | null = null;
    let archivedDocument: ArchivedDocument | null = null;

    if (file) {
      validateUploadFile(file);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const documentHash = generateDocumentHash(buffer);

        const existingDoc = await prisma.$queryRaw<DocumentRow[]>(
          Prisma.sql`
            SELECT id, client_id, policy_id, extracted_data, ocr_confidence
            FROM documents
            WHERE document_hash = ${documentHash} AND client_id = ${invite.clientId}
            LIMIT 1
          `
        );

        if (existingDoc.length > 0) {
          const row = existingDoc[0];
          archivedDocument = { id: row.id, clientId: row.client_id, policyId: row.policy_id, fileName: file.name };

          if (isRecord(row.extracted_data)) {
            const d = row.extracted_data;
            extractedData = {
              firstName: toNullableString(d.firstName),
              lastName: toNullableString(d.lastName),
              email: toNullableString(d.email),
              phone: toNullableString(d.phone),
              dateOfBirth: toNullableString(d.dateOfBirth),
              policyNumber: toNullableString(d.policyNumber),
              policyType: toNullableString(d.policyType),
              insurerName: toNullableString(d.insurerName),
              insurerPhone: toNullableString(d.insurerPhone),
              insurerEmail: toNullableString(d.insurerEmail),
            };
          } else {
            extractedData = null;
          }
        } else {
          const otherClientDoc = await prisma.$queryRaw<Array<{ id: string; client_id: string }>>(
            Prisma.sql`
              SELECT id, client_id
              FROM documents
              WHERE document_hash = ${documentHash} AND client_id != ${invite.clientId}
              LIMIT 1
            `
          );
          if (otherClientDoc.length > 0) {
            console.warn(
              `Document hash collision: ${documentHash.slice(0, 16)}... exists for client ${otherClientDoc[0].client_id}; creating new for ${invite.clientId}`
            );
          }

          const ocrResult = await extractPolicyData(file, buffer);

          extractedData = {
            firstName: ocrResult.firstName,
            lastName: ocrResult.lastName,
            email: ocrResult.email,
            phone: ocrResult.phone,
            dateOfBirth: ocrResult.dateOfBirth,
            policyNumber: ocrResult.policyNumber,
            policyType: ocrResult.policyType,
            insurerName: ocrResult.insurerName,
            insurerPhone: ocrResult.insurerPhone,
            insurerEmail: ocrResult.insurerEmail,
          };

          const { storagePath } = await uploadDocument({
            fileBuffer: arrayBuffer,
            filename: file.name,
            contentType: file.type,
          });

          const documentId = randomUUID();

          await prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO documents (
                id, client_id, file_name, file_type, file_size, file_path, mime_type,
                uploaded_via, extracted_data, ocr_confidence, document_hash, created_at, updated_at
              ) VALUES (
                ${documentId},
                ${invite.clientId},
                ${file.name},
                ${file.type},
                ${file.size},
                ${storagePath},
                ${file.type},
                ${"invite"},
                ${extractedData ? JSON.stringify(extractedData) : null},
                ${ocrResult.confidence},
                ${documentHash},
                NOW(),
                NOW()
              )
            `
          );

          archivedDocument = { id: documentId, clientId: invite.clientId, policyId: null, fileName: file.name };
        }

        await prisma.audit_logs.create({
          data: {
            id: randomUUID(),
            action: AuditAction.DOCUMENT_UPLOADED,
            message: `Policy document uploaded via invite: ${file.name}`,
            client_id: invite.clientId,
            user_id: null,
            org_id: null,
            policy_id: null,
            created_at: new Date(),
          },
        });
      } catch (ocrError: unknown) {
        const msg = ocrError instanceof Error ? ocrError.message : String(ocrError);
        console.error("OCR/archive error:", msg);

        // Best-effort archive even if OCR fails
        try {
          const fileArrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(fileArrayBuffer);
          const documentHash = generateDocumentHash(buffer);

          const existingDoc = await prisma.$queryRaw<Array<{ id: string; client_id: string; policy_id: string | null }>>(
            Prisma.sql`
              SELECT id, client_id, policy_id
              FROM documents
              WHERE document_hash = ${documentHash} AND client_id = ${invite.clientId}
              LIMIT 1
            `
          );

          if (existingDoc.length > 0) {
            archivedDocument = {
              id: existingDoc[0].id,
              clientId: existingDoc[0].client_id,
              policyId: existingDoc[0].policy_id,
              fileName: file.name,
            };
          } else {
            const { storagePath } = await uploadDocument({
              fileBuffer: fileArrayBuffer,
              filename: file.name,
              contentType: file.type,
            });

            const documentId = randomUUID();
            await prisma.$executeRaw(
              Prisma.sql`
                INSERT INTO documents (
                  id, client_id, file_name, file_type, file_size, file_path, mime_type,
                  uploaded_via, extracted_data, ocr_confidence, document_hash, created_at, updated_at
                ) VALUES (
                  ${documentId},
                  ${invite.clientId},
                  ${file.name},
                  ${file.type},
                  ${file.size},
                  ${storagePath},
                  ${file.type},
                  ${"invite"},
                  ${null},
                  ${0},
                  ${documentHash},
                  NOW(),
                  NOW()
                )
              `
            );

            archivedDocument = { id: documentId, clientId: invite.clientId, policyId: null, fileName: file.name };
          }
        } catch (archiveError: unknown) {
          console.error("Failed to archive after OCR failure:", archiveError);
        }

        extractedData = null;
      }
    }

    // Manual policy data
    let policyInfo: Record<string, unknown> | null = null;
    if (policyDataRaw) {
      try {
        policyInfo = safeJson<Record<string, unknown>>(policyDataRaw);
      } catch {
        policyInfo = null;
      }
    }

    const finalPolicyData: Record<string, unknown> = {
      ...(extractedData ?? {}),
      ...(policyInfo ?? {}),
    };

    // Insurer lookup (lazy create: do not auto-create insurers)
    let insurerId: string | null = null;
    let carrierNameRaw: string | null = null;

    const insurerName = typeof finalPolicyData.insurerName === "string" ? finalPolicyData.insurerName : null;
    if (insurerName) {
      try {
        const insurerRows = await prisma.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT id FROM insurers WHERE LOWER(name) = LOWER(${insurerName}) LIMIT 1`
        );
        insurerId = insurerRows.length > 0 ? insurerRows[0].id : null;
        if (!insurerId) carrierNameRaw = insurerName;
      } catch (e: unknown) {
        console.error("Insurer lookup failed:", e);
        carrierNameRaw = insurerName;
      }
    }

    // Create/reuse policy (skip when change request)
    let policyId: string | null = null;
    const policyNumber = typeof finalPolicyData.policyNumber === "string" ? finalPolicyData.policyNumber : null;
    const policyType = typeof finalPolicyData.policyType === "string" ? finalPolicyData.policyType : null;

    if (insurerName && !isChangeRequest) {
      try {
        const existing = await prisma.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`
            SELECT id
            FROM policies
            WHERE client_id = ${invite.clientId}
              AND (policy_number = ${policyNumber} OR (policy_number IS NULL AND ${policyNumber} IS NULL))
              AND (
                (insurer_id IS NOT NULL AND insurer_id = ${insurerId})
                OR (insurer_id IS NULL AND carrier_name_raw = ${carrierNameRaw})
              )
            LIMIT 1
          `
        );

        if (existing.length > 0) {
          policyId = existing[0].id;
        } else {
          policyId = randomUUID();
          await prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO policies (
                id, client_id, insurer_id, carrier_name_raw, policy_number, policy_type, created_at, updated_at
              ) VALUES (
                ${policyId}, ${invite.clientId}, ${insurerId}, ${carrierNameRaw}, ${policyNumber}, ${policyType}, NOW(), NOW()
              )
            `
          );
        }
      } catch (e: unknown) {
        console.error("Policy create/reuse failed:", e);
      }
    }

    // Attach policy to document if document.policy_id is NULL
    if (archivedDocument?.id && policyId) {
      try {
        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE documents
            SET policy_id = ${policyId}, updated_at = NOW()
            WHERE id = ${archivedDocument.id} AND policy_id IS NULL
          `
        );
      } catch (e: unknown) {
        console.error("Document policy attach failed:", e);
      }
    }

    // Audit processed (best-effort)
    if (archivedDocument) {
      try {
        const { audit } = await import("@/lib/audit");
        await audit(AuditAction.DOCUMENT_PROCESSED, {
          clientId: invite.clientId,
          policyId: policyId ?? undefined,
          message: `Document processed: ${archivedDocument.fileName ?? "unknown"} (OCR: ${extractedData ? "success" : "failed"})`,
        });
      } catch (e: unknown) {
        console.error("Audit failed:", e);
      }
    }

    // Client data
    let clientInfo: Record<string, unknown> | null = null;
    if (clientDataRaw) {
      try {
        clientInfo = safeJson<Record<string, unknown>>(clientDataRaw);
      } catch {
        clientInfo = null;
      }
    }

    // Update client (best-effort)
    if (clientInfo || extractedData?.firstName || extractedData?.lastName) {
      try {
        const firstName =
          (typeof clientInfo?.firstName === "string" ? clientInfo.firstName : null) ??
          extractedData?.firstName ??
          invite.client.firstName;

        const lastName =
          (typeof clientInfo?.lastName === "string" ? clientInfo.lastName : null) ??
          extractedData?.lastName ??
          invite.client.lastName;

        const email =
          (typeof clientInfo?.email === "string" ? clientInfo.email : null) ??
          invite.client.email;

        const phone =
          (typeof clientInfo?.phone === "string" ? clientInfo.phone : null) ??
          extractedData?.phone ??
          invite.client.phone ??
          null;

        const dateOfBirth =
          typeof clientInfo?.dateOfBirth === "string"
            ? new Date(clientInfo.dateOfBirth)
            : typeof extractedData?.dateOfBirth === "string"
              ? new Date(extractedData.dateOfBirth)
              : invite.client.dateOfBirth;

        const ssnLast4 = typeof clientInfo?.ssnLast4 === "string" ? clientInfo.ssnLast4 : null;
        const maidenName = typeof clientInfo?.maidenName === "string" ? clientInfo.maidenName : null;
        const driversLicense = typeof clientInfo?.driversLicense === "string" ? clientInfo.driversLicense : null;
        const passportNumber = typeof clientInfo?.passportNumber === "string" ? clientInfo.passportNumber : null;

        const { generateClientFingerprint } = await import("@/lib/client-fingerprint");
        const fingerprint = generateClientFingerprint({
          email,
          firstName,
          lastName,
          dateOfBirth,
          ssnLast4,
          passportNumber,
          driversLicense,
        });

        await prisma.$executeRaw(
          Prisma.sql`
            UPDATE clients
            SET
              first_name = ${firstName},
              last_name = ${lastName},
              email = ${email},
              phone = ${phone},
              date_of_birth = ${dateOfBirth},
              ssn_last_4 = ${ssnLast4},
              maiden_name = ${maidenName},
              drivers_license = ${driversLicense},
              passport_number = ${passportNumber},
              client_fingerprint = ${fingerprint},
              updated_at = NOW()
            WHERE id = ${invite.clientId}
          `
        );
      } catch (e: unknown) {
        console.error("Client update failed:", e);
      }
    }

    // Mark invite used (first submission only)
    if (!invite.usedAt && !isChangeRequest) {
      try {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE client_invites SET used_at = ${now}, updated_at = NOW() WHERE id = ${invite.id}`
        );
      } catch (e: unknown) {
        console.error("Invite used_at update failed:", e);
      }
    }

    const receiptId = `REC-${invite.clientId}-${Date.now()}`;

    // Attorney/org
    let attorney: { id: string; email: string; firstName: string | null; lastName: string | null } | null = null;
    let organization:
      | {
          id: string;
          name: string;
          addressLine1: string | null;
          addressLine2: string | null;
          city: string | null;
          state: string | null;
          postalCode: string | null;
          phone: string | null;
        }
      | null = null;

    try {
      const access = await prisma.$queryRaw<AttorneyAccessRow[]>(
        Prisma.sql`
          SELECT
            aca.attorney_id,
            u.email as attorney_email,
            u.first_name as attorney_first_name,
            u.last_name as attorney_last_name,
            o.id as org_id,
            o.name as org_name,
            o.address_line1 as org_address_line1,
            o.address_line2 as org_address_line2,
            o.city as org_city,
            o.state as org_state,
            o.postal_code as org_postal_code,
            o.phone as org_phone
          FROM attorney_client_access aca
          INNER JOIN users u ON u.id = aca.attorney_id
          LEFT JOIN org_members om ON om.user_id = aca.attorney_id
          LEFT JOIN organizations o ON o.id = om.organization_id
          WHERE aca.client_id = ${invite.clientId} AND aca.is_active = true
          LIMIT 1
        `
      );

      if (access.length > 0) {
        const row = access[0];
        attorney = {
          id: row.attorney_id,
          email: row.attorney_email,
          firstName: row.attorney_first_name,
          lastName: row.attorney_last_name,
        };
        organization = {
          id: row.org_id,
          name: row.org_name,
          addressLine1: row.org_address_line1,
          addressLine2: row.org_address_line2,
          city: row.org_city,
          state: row.org_state,
          postalCode: row.org_postal_code,
          phone: row.org_phone,
        };
      }
    } catch (e: unknown) {
      console.error("Attorney/org lookup failed:", e);
    }

    // Client + policies for receipt
    let clientRow: ClientRow | null = null;
    let policies: PolicyRow[] = [];

    try {
      const [clients, pols] = await Promise.all([
        prisma.$queryRaw<ClientRow[]>(
          Prisma.sql`
            SELECT id, first_name, last_name, email, phone, date_of_birth, created_at
            FROM clients
            WHERE id = ${invite.clientId}
            LIMIT 1
          `
        ),
        prisma.$queryRaw<PolicyRow[]>(
          Prisma.sql`
            SELECT
              p.id,
              p.policy_number,
              p.policy_type,
              p.carrier_name_raw,
              i.name as insurer_name,
              i.contact_phone as insurer_contact_phone,
              i.contact_email as insurer_contact_email
            FROM policies p
            LEFT JOIN insurers i ON i.id = p.insurer_id
            WHERE p.client_id = ${invite.clientId}
          `
        ),
      ]);

      clientRow = clients.length > 0 ? clients[0] : null;
      policies = pols;
    } catch (e: unknown) {
      console.error("Client/policies fetch failed:", e);
    }

    const receiptData = {
      receiptId,
      client: {
        firstName: clientRow?.first_name ?? invite.client.firstName,
        lastName: clientRow?.last_name ?? invite.client.lastName,
        email: clientRow?.email ?? invite.client.email,
        phone: clientRow?.phone ?? invite.client.phone,
        dateOfBirth: clientRow?.date_of_birth ?? invite.client.dateOfBirth,
      },
      policies: policies.map((p) => ({
        id: p.id,
        policyNumber: p.policy_number,
        policyType: p.policy_type,
        insurer: p.insurer_name
          ? {
              name: p.insurer_name,
              contactPhone: p.insurer_contact_phone,
              contactEmail: p.insurer_contact_email,
            }
          : {
              name: p.carrier_name_raw ?? "Unknown Insurer",
              contactPhone: null,
              contactEmail: null,
            },
      })),
      organization: organization
        ? {
            name: organization.name,
            addressLine1: organization.addressLine1 ?? undefined,
            addressLine2: organization.addressLine2 ?? undefined,
            city: organization.city ?? undefined,
            state: organization.state ?? undefined,
            postalCode: organization.postalCode ?? undefined,
            phone: organization.phone ?? undefined,
          }
        : null,
      registeredAt: clientRow?.created_at ?? invite.client.createdAt,
      receiptGeneratedAt: new Date(),
    };

    // Receipt PDF
    let receiptPdfBuffer: Buffer | null = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const updateUrl = `${baseUrl}/qr-update/${token}`;

      const pdfStream = await renderToStream(
        ClientReceiptPDF({
          receiptData: {
            ...receiptData,
            updateUrl,
          },
        })
      );

      receiptPdfBuffer = await streamToBuffer(pdfStream);
    } catch (e: unknown) {
      console.error("Receipt PDF generation failed:", e);
    }

    // Fire-and-forget emails
    const emailJobs: Promise<unknown>[] = [];

    if (receiptPdfBuffer) {
      emailJobs.push(
        sendClientReceiptEmail({
          to: receiptData.client.email,
          clientName: `${receiptData.client.firstName} ${receiptData.client.lastName}`,
          receiptId,
          receiptPdf: receiptPdfBuffer,
          firmName: organization?.name,
        }).catch((e: unknown) => console.error("Client receipt email failed:", e))
      );
    }

    if (attorney && organization) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const updateUrl = `${baseUrl}/qr-update/${token}`;

      if (typeof attorney.email === "string" && attorney.email.includes("@")) {
        emailJobs.push(
          sendAttorneyNotificationEmail({
            to: attorney.email,
            attorneyName: attorney.firstName ?? "Attorney",
            clientName: `${receiptData.client.firstName} ${receiptData.client.lastName}`,
            receiptId,
            policiesCount: receiptData.policies.length,
            updateUrl,
          }).catch((e: unknown) => console.error("Attorney notification email failed:", e))
        );
      }
    }

    void Promise.all(emailJobs);

    return NextResponse.json({
      success: true,
      receiptId,
      clientId: invite.clientId,
      policyId,
      message: "Policy uploaded successfully",
      receiptData,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error uploading policy:", error);
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
