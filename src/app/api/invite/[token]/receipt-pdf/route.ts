import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { getOrCreateTestInvite } from "@/lib/test-invites";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Try to get or create test invite first
    let invite = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await prisma.clientInvite.findUnique({
      where: { token },
      include: {
        client: {
          include: {
            policies: {
              include: {
                insurer: true,
              },
            },
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    // Get organization info if available
    const access = await prisma.attorneyClientAccess.findFirst({
      where: {
        clientId: invite.clientId,
        isActive: true,
      },
      include: {
        attorney: {
          include: {
            orgMemberships: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    const organization = access?.attorney?.orgMemberships?.[0]?.organization;

    const receiptData = {
      receiptId: `REC-${invite.clientId}-${invite.createdAt.getTime()}`,
      client: {
        firstName: invite.client.firstName,
        lastName: invite.client.lastName,
        email: invite.client.email,
        phone: invite.client.phone,
        dateOfBirth: invite.client.dateOfBirth,
      },
      policies: invite.client.policies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        insurer: {
          name: p.insurer.name,
          contactPhone: p.insurer.contactPhone,
          contactEmail: p.insurer.contactEmail,
        },
      })),
      organization: organization
        ? {
            name: organization.name,
            addressLine1: organization.addressLine1,
            addressLine2: organization.addressLine2,
            city: organization.city,
            state: organization.state,
            postalCode: organization.postalCode,
            phone: organization.phone,
          }
        : null,
      registeredAt: invite.client.createdAt,
      receiptGeneratedAt: new Date(),
      updateUrl: `${req.nextUrl.origin}/invite/${token}/update`,
    };

    // Generate PDF
    const pdfStream = await renderToStream(
      ClientReceiptPDF({ receiptData })
    );

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="heirvault-receipt-${receiptData.receiptId}.pdf"`
    );

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

