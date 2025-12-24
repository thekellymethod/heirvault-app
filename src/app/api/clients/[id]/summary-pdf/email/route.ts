import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ClientRegistrySummaryPDF } from "@/pdfs/ClientRegistrySummary";
import { renderToStream } from "@react-pdf/renderer";
import { requireAttorneyOrOwner } from "@/lib/authz";
import { audit, AuditAction } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await requireAttorneyOrOwner();
  } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
    return NextResponse.json(
      { error: e.message || "Unauthorized" },
      { status: e.status || 401 }
    );
  }

  const { user, orgMember } = ctx;
  const { id } = await params;
  const body = await req.json();
  const { email } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email address is required" },
      { status: 400 }
    );
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        policies: {
          include: {
            insurer: true,
            beneficiaries: {
              include: {
                beneficiary: true,
              },
            },
          },
        },
        beneficiaries: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Generate PDF
    const pdfStream = await renderToStream(
      ClientRegistrySummaryPDF({
        client: {
          ...client,
          dateOfBirth: client.dateOfBirth,
          createdAt: client.createdAt,
        },
        firmName: orgMember?.organizations.name,
        generatedAt: new Date(),
      })
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = pdfStream.getReader();
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        chunks.push(value);
      }
    }

    const pdfBuffer = Buffer.concat(chunks);

    // Send email with PDF attachment
    const clientName = `${client.firstName} ${client.lastName}`;
    const fileName = `heirvault-${client.lastName}-${client.firstName}.pdf`;

    await sendEmail({
      to: email,
      subject: `HeirVault Client Registry Report - ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111C33; margin-bottom: 20px;">HeirVault Client Registry Report</h2>
          <p style="color: #253246; line-height: 1.6;">
            Please find attached the comprehensive client registry report for <strong>${clientName}</strong>.
          </p>
          <p style="color: #253246; line-height: 1.6;">
            This report includes all registered policies, beneficiaries, and related information.
          </p>
          <hr style="border: none; border-top: 1px solid #D9E2EE; margin: 30px 0;" />
          <p style="color: #6B7280; font-size: 12px;">
            This is an automated message from HeirVault. Please do not reply to this email.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    await audit(AuditAction.CLIENT_SUMMARY_PDF_DOWNLOADED, {
      clientId: client.id,
      message: `Summary PDF emailed to ${email} for ${client.firstName} ${client.lastName}`,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "PDF report has been sent successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to email PDF";
    console.error("Error emailing PDF:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

