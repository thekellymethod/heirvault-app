import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { ClientBallotPDF } from "@/pdfs/ClientBallotPDF";
import { requireAdmin } from "@/lib/auth/guards";
import QRCode from "qrcode";

/**
 * Generate a sample invitation code form PDF for demonstration purposes (admin only)
 * This shows what the ballot-style form looks like when sent to a new policyholder
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    // Sample invite data (for a new policyholder who hasn't registered yet)
    const sampleInviteData = {
      receiptId: "INV-SAMPLE-20250101-001",
      client: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        phone: null, // Not provided yet
        dateOfBirth: null, // Not provided yet
      },
      policies: [], // No policies yet - they'll add them via the form
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
      updateUrl: `${req.nextUrl.origin}/invite/SAMPLE-INVITE-CODE-1234567890abcdef`,
    };

    // Generate QR code for invite form (so they can scan to access upload portal)
    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(sampleInviteData.updateUrl, {
        errorCorrectionLevel: "M",
        type: "image/png",
        width: 200,
        margin: 1,
      });
    } catch (qrError) {
      console.error("Error generating sample invite QR code:", qrError);
      // Continue without QR code
    }

    const pdfStream = await renderToStream(
      ClientBallotPDF({
        ballotData: {
          ...sampleInviteData,
          qrCodeDataUrl,
        },
      })
    );

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      'attachment; filename="heirvault-sample-invite-form.pdf"'
    );

    return new NextResponse(pdfStream as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating sample invite PDF:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to generate sample invite PDF" },
      { status: 500 }
    );
  }
}

