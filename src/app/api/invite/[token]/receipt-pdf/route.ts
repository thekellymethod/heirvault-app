import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";
import type { Prisma } from "@prisma/client";

type InviteClient = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
  createdAt?: Date;
};

type InviteBase = {
  clientId: string;
  client: InviteClient;
  createdAt: Date;
};

function isInviteBase(value: unknown): value is InviteBase {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.clientId === "string" &&
    typeof v.client === "object" &&
    v.client !== null &&
    v.createdAt instanceof Date
  );
}

type PolicyRow = {
  id: string;
  policy_number: string | null;
  policy_type: string | null;
  insurer_name: string;
  insurer_contact_phone: string | null;
  insurer_contact_email: string | null;
};

type ReceiptPolicy = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  insurer: {
    name: string;
    contactPhone: string | null;
    contactEmail: string | null;
  };
};

type OrgRow = {
  org_id: string;
  org_name: string;
  org_address_line1: string | null;
  org_address_line2: string | null;
  org_city: string | null;
  org_state: string | null;
  org_postal_code: string | null;
  org_phone: string | null;
};

type ReceiptOrganization = {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
} | null;

/**
 * renderToStream can return:
 * - a NodeJS.ReadableStream (Node runtime)
 * - a Web ReadableStream (some environments)
 *
 * NextResponse supports Web ReadableStream. If we get Node stream, we can still return it,
 * but Next 13/14 handlers typically prefer web streams. We'll convert Node->web if needed.
 */
function nodeToWebReadable(nodeStream: NodeJS.ReadableStream): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.removeAllListeners();
    }
    ,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const maybeInvite =
      (await getOrCreateTestInvite(token)) ?? (await lookupClientInvite(token));

    if (!isInviteBase(maybeInvite)) {
      return NextResponse.json({ error: "Invalid invitation code" }, { status: 404 });
    }

    const { clientId, client: inviteClient, createdAt: inviteCreatedAt } = maybeInvite;

    // Policies (raw SQL because your lookup may not eager-load policies)
    let policies: ReceiptPolicy[] = [];
    try {
      const policiesResult = await prisma.$queryRaw<PolicyRow[]>`
        SELECT
          p.id,
          p.policy_number,
          p.policy_type,
          i.name as insurer_name,
          i.contact_phone as insurer_contact_phone,
          i.contact_email as insurer_contact_email
        FROM policies p
        INNER JOIN insurers i ON i.id = p.insurer_id
        WHERE p.client_id = ${clientId}
      `;

      policies = (policiesResult ?? []).map((p) => ({
        id: p.id,
        policyNumber: p.policy_number,
        policyType: p.policy_type,
        insurer: {
          name: p.insurer_name,
          contactPhone: p.insurer_contact_phone,
          contactEmail: p.insurer_contact_email,
        },
      }));
    } catch (sqlError: unknown) {
      const msg = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Receipt PDF: Failed to fetch policies:", msg);
      policies = [];
    }

    // Organization lookup (optional)
    let organization: ReceiptOrganization = null;
    try {
      // Adjust table names/columns if yours differ.
      const accessResult = await prisma.$queryRaw<OrgRow[]>`
        SELECT
          o.id as org_id,
          o.name as org_name,
          o.address_line1 as org_address_line1,
          o.address_line2 as org_address_line2,
          o.city as org_city,
          o.state as org_state,
          o.postal_code as org_postal_code,
          o.phone as org_phone
        FROM attorney_client_access aca
        LEFT JOIN org_members om ON om.user_id = aca.attorney_id
        LEFT JOIN organizations o ON o.id = om.organization_id
        WHERE aca.client_id = ${clientId} AND aca.is_active = true
        LIMIT 1
      `;

      if (accessResult?.length) {
        const row = accessResult[0];
        organization = {  
          name: row.org_name,
          addressLine1: row.org_address_line1 ?? undefined,
          addressLine2: row.org_address_line2 ?? undefined,
          city: row.org_city ?? undefined,
          state: row.org_state ?? undefined,
          postalCode: row.org_postal_code ?? undefined,
          phone: row.org_phone ?? undefined,
        };
      }
    } catch (sqlError: unknown) {
      const msg = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Receipt PDF: Organization lookup failed:", msg);
      organization = null;
    }

    const receiptData = {
      receiptId: `REC-${clientId}-${inviteCreatedAt.getTime()}`,
      client: {
        firstName: inviteClient.firstName ?? "",
        lastName: inviteClient.lastName ?? "",
        email: inviteClient.email ?? "",
        phone: inviteClient.phone ?? null,
        dateOfBirth: inviteClient.dateOfBirth ?? null,
      },
      policies,
      organization,
      registeredAt: inviteClient.createdAt ?? inviteCreatedAt ?? new Date(),
      receiptGeneratedAt: new Date(),
      updateUrl: `${req.nextUrl.origin}/qr-update/${token}`,
    };

    const rendered = await renderToStream(ClientReceiptPDF({ receiptData }));

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="heirvault-receipt-${receiptData.receiptId}.pdf"`
    );

    // Handle both Node and Web streams safely
    const maybeWeb = rendered as unknown as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };
    const body: ReadableStream =
      typeof maybeWeb?.getReader === "function"
        ? (rendered as unknown as ReadableStream)
        : nodeToWebReadable(rendered as unknown as NodeJS.ReadableStream);

    return new NextResponse(body, { status: 200, headers });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
