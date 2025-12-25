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
    let invite: Awaited<ReturnType<typeof getOrCreateTestInvite>> | Awaited<ReturnType<typeof lookupClientInvite>> | null = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await lookupClientInvite(token);
    }

    if (!invite || typeof invite !== 'object' || !('clientId' in invite) || !('client' in invite) || !('createdAt' in invite)) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }
    
    // Extract properties with type assertion after type guard
    const typedInvite = invite as { 
      clientId: string, 
      client: { 
        firstName?: string, 
        lastName?: string,
      };
      createdAt: Date;
    };
    const clientId = typedInvite.clientId;
    const inviteClient = typedInvite.client;
    const inviteCreatedAt = typedInvite.createdAt;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const updateUrl = `${baseUrl}/invite/${token}/update`;
    const receiptId = `REC-${clientId}-${inviteCreatedAt.getTime()}`;

    const formData = {
      receiptId,
      clientName: `${inviteClient.firstName || ""} ${inviteClient.lastName || ""}`,
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

    return new NextResponse(pdfStream as unknown as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error generating update form PDF:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
