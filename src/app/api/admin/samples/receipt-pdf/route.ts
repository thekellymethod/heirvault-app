import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { ClientBallotPDF } from "@/pdfs/ClientBallotPDF";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth/guards";

/**
 * Generate a sample receipt PDF for demonstration purposes (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    // Sample receipt data
    const sampleReceiptData = {
      receiptId: "REC-SAMPLE-20250101-001",
      client: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1 (555) 123-4567",
        dateOfBirth: new Date("1980-05-15"),
      },
      policies: [
        {
          id: "policy-1",
          policyNumber: "POL-123456789",
          policyType: "Term Life Insurance",
          insurer: {
            name: "Example Life Insurance Company",
            contactPhone: "+1 (555) 987-6543",
            contactEmail: "support@examplelife.com",
          },
        },
        {
          id: "policy-2",
          policyNumber: "POL-987654321",
          policyType: "Whole Life Insurance",
          insurer: {
            name: "Another Insurance Provider",
            contactPhone: "+1 (555) 111-2222",
            contactEmail: "contact@anotherins.com",
          },
        },
      ],
      organization: {
        name: "Smith & Associates Law Firm",
        addressLine1: "123 Main Street",
        addressLine2: "Suite 400",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        phone: "+1 (555) 555-5555",
      },
      registeredAt: new Date(),
      receiptGeneratedAt: new Date(),
      updateUrl: `${req.nextUrl.origin}/qr-update/SAMPLE-TOKEN-1234567890`,
    };

    // Generate QR code for sample
    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(sampleReceiptData.updateUrl, {
        errorCorrectionLevel: "M",
        type: "image/png",
        width: 200,
        margin: 1,
      });
    } catch (qrError) {
      console.error("Error generating sample QR code:", qrError);
      // Continue without QR code
    }

    const pdfStream = await renderToStream(
      ClientBallotPDF({
        ballotData: {
          ...sampleReceiptData,
          qrCodeDataUrl,
        },
      })
    );

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      'attachment; filename="heirvault-sample-receipt.pdf"'
    );

    return new NextResponse(pdfStream as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating sample receipt PDF:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to generate sample receipt PDF" },
      { status: 500 }
    );
  }
}

