// src/app/api/invite/[token]/receipt-pdf/route.ts

import { NextRequest, NextResponse } from "next/server";
import { decodePassportForm } from "@/lib/ocr-form-decoder";
import { uploadDocument } from "@/lib/storage";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { sendClientReceiptEmail, sendAttorneyNotificationEmail } from "@/lib/email";
import { AuditAction } from "@/lib/db/enums";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/** Minimal shape we rely on from OCR output. */
type DecodedPassportData = {
  confidence?: number;

  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;

  policyNumber?: string | null;
  policyType?: string | null;
  insurerName?: string | null;

  [key: string]: unknown;
};

type InviteClientShape = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  dateOfBirth?: Date | null;

  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;

  // optional; your invite lookup might already populate these
  policies?: Array<{
    id: string;
    policyNumber: string | null;
    policyType: string | null;
    insurer: { name: string };
  }>;
  beneficiaries?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationship: string | null;
    percentage: number | null;
  }>;
};

type InviteShape = {
  clientId: string;
  client: InviteClientShape;
};

function toInputJson(value: unknown): Record<string, unknown> {
  // Convert to JSON-safe object
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function asInviteShape(invite: unknown): InviteShape | null {
  if (!invite || typeof invite !== "object") return null;
  if (!("clientId" in invite) || !("client" in invite)) return null;

  const clientId = (invite as { clientId?: unknown }).clientId;
  const client = (invite as { client?: unknown }).client;

  if (typeof clientId !== "string") return null;
  if (!client || typeof client !== "object") return null;

  return { clientId, client: client as InviteClientShape };
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  // @react-pdf/renderer can return either a web ReadableStream or a NodeJS stream depending on env
  const maybeWeb = stream as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };

  if (typeof maybeWeb?.getReader === "function") {
    const reader = maybeWeb.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 1) Resolve invite (test invite first; fallback to real lookup)
    const rawInvite =
      (await getOrCreateTestInvite(token)) ?? (await lookupClientInvite(token));

    const invite = asInviteShape(rawInvite);
    if (!invite) {
      return NextResponse.json({ error: "Invalid invitation code" }, { status: 404 });
    }

    const clientId = invite.clientId;
    const inviteClient = invite.client;

    // 2) Read form file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Scanned form file is required" }, { status: 400 });
    }

    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or image file." },
        { status: 400 }
      );
    }

    // 3) Decode OCR
    const buf = Buffer.from(await file.arrayBuffer());
    let decodedData: DecodedPassportData;

    try {
      decodedData = (await decodePassportForm(file, buf)) as DecodedPassportData;
    } catch (ocrError: unknown) {
      const message = ocrError instanceof Error ? ocrError.message : "Unknown error";
      console.error("Error decoding form:", ocrError);
      return NextResponse.json({ error: `Failed to process form: ${message}` }, { status: 400 });
    }

    // 4) Archive uploaded file (best-effort)
    let archivedDocument: { id: string } | null = null;
    try {
      const { storagePath } = await uploadDocument({
        fileBuffer: await file.arrayBuffer(),
        filename: file.name,
        contentType: file.type,
      });

      const { create: createDocument } = await import("@/lib/db");
      archivedDocument = await createDocument("documents", {
        id: randomUUID(),
        clientId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: storagePath,
        mimeType: file.type,
        uploadedVia: "update-form",
        extractedData: toInputJson(decodedData),
        ocrConfidence:
          typeof decodedData.confidence === "number"
            ? Math.round(decodedData.confidence * 100)
            : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>) as { id: string };
    } catch (archiveError: unknown) {
      console.error("Failed to archive form:", archiveError);
      // Continue anyway
    }

    // 5) Update client info
    const { update: updateClient } = await import("@/lib/db");
    const updatedClient = await updateClient("clients", { id: clientId }, {
      firstName: decodedData.firstName || inviteClient.firstName || "",
      lastName: decodedData.lastName || inviteClient.lastName || "",
      email: decodedData.email || inviteClient.email || "",
      phone: decodedData.phone || inviteClient.phone || null,
      dateOfBirth: toDate(decodedData.dateOfBirth) ?? inviteClient.dateOfBirth ?? null,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>) as {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      dateOfBirth: Date | null;
      createdAt: Date;
    };

    // 6) Create or update insurer/policy if present
    let updatedPolicy: { id: string } | null = null;

    if (decodedData.policyNumber || decodedData.insurerName) {
      let insurer: { id: string } | null = null;

      const { findMany: findManyInsurers, create: createInsurer, findMany: findManyPolicies, create: createPolicy, update: updatePolicy, update: updateDocument } = await import("@/lib/db");
      
      if (decodedData.insurerName) {
        const insurers = await findManyInsurers("insurers", {
          where: { name: { ilike: decodedData.insurerName } },
          limit: 1,
        });
        
        insurer = insurers && insurers.length > 0 ? (insurers[0] as { id: string }) : null;

        if (!insurer) {
          insurer = await createInsurer("insurers", {
            id: randomUUID(),
            name: decodedData.insurerName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>) as { id: string };
        }
      }

      if (insurer) {
        const existingPolicies = await findManyPolicies("policies", {
          where: { clientId, insurerId: insurer.id },
          limit: 1,
        });
        
        const existingPolicy = existingPolicies && existingPolicies.length > 0 
          ? (existingPolicies[0] as { id: string; policyNumber: string | null; policyType: string | null })
          : null;

        if (existingPolicy) {
          updatedPolicy = await updatePolicy("policies", { id: existingPolicy.id }, {
            policyNumber: decodedData.policyNumber || existingPolicy.policyNumber || null,
            policyType: decodedData.policyType || existingPolicy.policyType || null,
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>) as { id: string };
        } else {
          updatedPolicy = await createPolicy("policies", {
            id: randomUUID(),
            clientId,
            insurerId: insurer.id,
            policyNumber: decodedData.policyNumber || null,
            policyType: decodedData.policyType || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>) as { id: string };
        }

        if (archivedDocument && updatedPolicy) {
          await updateDocument("documents", { id: archivedDocument.id }, {
            policyId: updatedPolicy.id,
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>);
        }
      }
    }

    // 7) Get org + attorney info (best-effort)
    const { findMany: findManyAccess, findMany: findManyUsers, findMany: findManyOrgMembers, findMany: findManyOrgs, findMany: findManyPoliciesForReceipt, findMany: findManyInsurersForReceipt } = await import("@/lib/db");
    
    const accesses = await findManyAccess("attorney_client_access", {
      where: { clientId, isActive: true },
      limit: 1,
    });
    
    const access = accesses && accesses.length > 0 ? accesses[0] : null;
    
    let organization: any = null;
    let attorney: any = null;
    
    if (access) {
      const attorneyId = (access as any).attorneyId;
      const users = await findManyUsers("users", {
        where: { id: attorneyId },
        limit: 1,
      });
      attorney = users && users.length > 0 ? users[0] : null;
      
      if (attorney) {
        const orgMembers = await findManyOrgMembers("org_members", {
          where: { userId: attorneyId },
          limit: 1,
        });
        
        if (orgMembers && orgMembers.length > 0) {
          const orgId = (orgMembers[0] as any).organizationId;
          const orgs = await findManyOrgs("organizations", {
            where: { id: orgId },
            limit: 1,
          });
          organization = orgs && orgs.length > 0 ? orgs[0] : null;
        }
      }
    }

    // 8) Fetch updated policies for receipt
    const updatedPoliciesData = await findManyPoliciesForReceipt("policies", {
      where: { clientId },
    });
    
    // Fetch insurers for policies
    const insurerIds = (updatedPoliciesData || []).map((p: any) => p.insurerId).filter(Boolean);
    const insurers = insurerIds.length > 0
      ? await findManyInsurersForReceipt("insurers", {
          where: { id: { in: insurerIds } },
        })
      : [];
    
    const updatedPolicies = (updatedPoliciesData || []).map((p: any) => {
      const insurer = (insurers || []).find((i: any) => i.id === p.insurerId);
      return {
        ...p,
        insurers: insurer || null,
      };
    });

    const receiptId = `REC-${clientId}-${Date.now()}`;

    const receiptData = {
      receiptId,
      client: {
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        email: updatedClient.email,
        phone: updatedClient.phone,
        dateOfBirth: updatedClient.dateOfBirth,
      },
      policies: updatedPolicies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        insurer: p.insurers
          ? {
              name: p.insurers.name,
              contactPhone: p.insurers.contactPhone,
              contactEmail: p.insurers.contactEmail,
            }
          : { name: "Unknown", contactPhone: null, contactEmail: null },
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
      registeredAt: updatedClient.createdAt,
      receiptGeneratedAt: new Date(),
    };

    // 9) Render PDF
    let receiptPdfBuffer: Buffer | null = null;
    try {
      const stream = await renderToStream(
        ClientReceiptPDF({
          receiptData: {
            receiptId,
            client: {
              firstName: receiptData.client.firstName,
              lastName: receiptData.client.lastName,
              email: receiptData.client.email,
              phone: receiptData.client.phone,
              dateOfBirth: receiptData.client.dateOfBirth
                ? new Date(receiptData.client.dateOfBirth)
                : null,
            },
            policies: receiptData.policies,
            organization: receiptData.organization,
            registeredAt: receiptData.registeredAt,
            receiptGeneratedAt: receiptData.receiptGeneratedAt,
          },
        })
      );

      receiptPdfBuffer = await streamToBuffer(stream);
    } catch (pdfError: unknown) {
      console.error("Error generating receipt PDF:", pdfError);
    }

    // 10) Fire-and-forget emails
    const emailTasks: Array<Promise<unknown>> = [];

    if (receiptPdfBuffer && receiptData.client.email) {
      emailTasks.push(
        sendClientReceiptEmail({
          to: receiptData.client.email,
          clientName: `${receiptData.client.firstName} ${receiptData.client.lastName}`.trim(),
          receiptId,
          receiptPdf: receiptPdfBuffer,
          firmName: organization?.name,
        }).catch((e) => console.error("Error sending client receipt email:", e))
      );
    }

    if (attorney && organization) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const updateUrl = `${baseUrl}/qr-update/${token}`;

      const attorneyEmail =
        typeof attorney.email === "string" ? attorney.email : null;

      if (attorneyEmail && attorneyEmail.includes("@")) {
        emailTasks.push(
          sendAttorneyNotificationEmail({
            to: attorneyEmail,
            attorneyName: attorney.firstName || "Attorney",
            clientName: `${receiptData.client.firstName} ${receiptData.client.lastName}`.trim(),
            receiptId,
            policiesCount: receiptData.policies.length,
            updateUrl,
          }).catch((e) => console.error("Error sending attorney notification email:", e))
        );
      }
    }

    void Promise.all(emailTasks);

    // 11) Audit log
    const { create: createAudit } = await import("@/lib/db");
    await createAudit("audit_logs", {
      id: randomUUID(),
      action: AuditAction.CLIENT_UPDATED,
      message: `Client information updated via scanned form: ${file.name}`,
      clientId,
      policyId: updatedPolicy?.id ?? null,
      userId: null,
      orgId: null,
      createdAt: new Date().toISOString(),
    } as Record<string, unknown>);

    return NextResponse.json({
      success: true,
      receiptId,
      message: "Form processed successfully. Updated receipt has been sent to your email.",
      decodedData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error processing update form:", error);
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
