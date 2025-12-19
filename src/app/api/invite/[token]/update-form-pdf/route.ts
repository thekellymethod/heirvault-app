import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { UpdateFormPDF } from "@/pdfs/UpdateFormPDF";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Try to get or create test invite first
    let invite: any = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await lookupClientInvite(token);
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const updateUrl = `${baseUrl}/invite/${token}/update`;
    const receiptId = `REC-${invite.clientId}-${invite.createdAt.getTime()}`;

    const formData = {
      receiptId,
      clientName: `${invite.client.firstName} ${invite.client.lastName}`,
      token,
      updateUrl,
    };

    // Generate PDF
    const pdfStream = await renderToStream(UpdateFormPDF({ formData }));

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="update-form-${receiptId}.pdf"`
    );

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Error generating update form PDF:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
