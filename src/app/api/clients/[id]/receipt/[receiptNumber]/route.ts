import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertAttorneyCanAccessClient } from "@/lib/authz";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";

/**
 * Download receipt PDF for a client
 * Requires attorney authentication and access to the client
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; receiptNumber: string }> }
) {
  try {
    const { id: clientId, receiptNumber } = await params;
    
    // Verify attorney has access to this client
    await assertAttorneyCanAccessClient(clientId);

    // Get receipt record to determine historical state
    const receiptData = await prisma.$queryRawUnsafe<Array<{
      id: string;
      receipt_number: string;
      client_id: string;
      created_at: Date;
    }>>(`
      SELECT id, receipt_number, client_id, created_at
      FROM receipts
      WHERE client_id = $1 AND receipt_number = $2
      LIMIT 1
    `, clientId, receiptNumber);

    if (!receiptData || receiptData.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const receipt = receiptData[0];

    // Get client data
    const clientData = await prisma.$queryRawUnsafe<Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      date_of_birth: Date | null;
      created_at: Date;
    }>>(`
      SELECT id, first_name, last_name, email, phone, date_of_birth, created_at
      FROM clients
      WHERE id = $1
      LIMIT 1
    `, clientId);

    if (!clientData || clientData.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientData[0];

    // CRITICAL: Get policies that existed at the time the receipt was created
    // This preserves historical accuracy - policies added/modified after receipt creation
    // will not appear in the receipt PDF, ensuring it matches the receipt hash
    const policies = await prisma.$queryRawUnsafe<Array<{
      id: string;
      policy_number: string | null;
      policy_type: string | null;
      insurer_name: string;
      insurer_contact_phone: string | null;
      insurer_contact_email: string | null;
    }>>(`
      SELECT 
        p.id,
        p.policy_number,
        p.policy_type,
        i.name as insurer_name,
        i.contact_phone as insurer_contact_phone,
        i.contact_email as insurer_contact_email
      FROM policies p
      INNER JOIN insurers i ON i.id = p.insurer_id
      WHERE p.client_id = $1
        AND p.created_at <= $2
      ORDER BY p.created_at ASC
    `, clientId, receipt.created_at);

    // Get organization info if available
    let organization = null;
    try {
      const orgData = await prisma.$queryRawUnsafe<Array<{
        name: string;
        address_line1: string | null;
        address_line2: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        phone: string | null;
      }>>(`
        SELECT o.name, o.address_line1, o.address_line2, o.city, o.state, o.postal_code, o.phone
        FROM organizations o
        INNER JOIN org_members om ON om.organization_id = o.id
        INNER JOIN attorney_client_access aca ON aca.organization_id = o.id
        WHERE aca.client_id = $1 AND aca.is_active = true
        LIMIT 1
      `, clientId);

      if (orgData && orgData.length > 0) {
        organization = orgData[0];
      }
    } catch (error) {
      // Organization info is optional
      console.warn("Could not fetch organization info:", error);
    }

    const receiptPayload = {
      receiptId: receiptNumber,
      client: {
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone,
        dateOfBirth: client.date_of_birth,
      },
      policies: policies.map((p) => ({
        id: p.id,
        policyNumber: p.policy_number,
        policyType: p.policy_type,
        insurer: {
          name: p.insurer_name,
          contactPhone: p.insurer_contact_phone,
          contactEmail: p.insurer_contact_email,
        },
      })),
      organization: organization
        ? {
            name: organization.name,
            addressLine1: organization.address_line1 || undefined,
            addressLine2: organization.address_line2 || undefined,
            city: organization.city || undefined,
            state: organization.state || undefined,
            postalCode: organization.postal_code || undefined,
            phone: organization.phone || undefined,
          }
        : null,
      registeredAt: client.created_at,
      receiptGeneratedAt: receipt.created_at, // Use receipt creation time, not current time
    };

    // Generate PDF
    const pdfStream = await renderToStream(ClientReceiptPDF({ receiptData: receiptPayload }));

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="receipt-${receiptNumber}.pdf"`
    );

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating receipt PDF:", errorMessage);
    
    if (errorMessage === "Unauthorized" || errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: errorMessage || "Failed to generate receipt" },
      { status: 500 }
    );
  }
}

