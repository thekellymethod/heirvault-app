import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertAttorneyCanAccessClient } from "@/lib/authz";
import { renderToStream } from "@react-pdf/renderer";
import { AuditTrailReportPDF } from "@/pdfs/AuditTrailReportPDF";

/**
 * Export comprehensive audit trail report as PDF
 * Requires attorney authentication and access to the client
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    
    // Verify attorney has access to this client
    await assertAttorneyCanAccessClient(clientId);

    // Get client info
    const clientData = await prisma.$queryRawUnsafe<Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      created_at: Date;
    }>>(`
      SELECT id, first_name, last_name, email, created_at
      FROM clients
      WHERE id = $1
      LIMIT 1
    `, clientId);

    if (!clientData || clientData.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientData[0];

    // Get all receipts
    const receipts = await prisma.$queryRawUnsafe<Array<{
      receipt_number: string;
      created_at: Date;
      email_sent: boolean;
      email_sent_at: Date | null;
    }>>(`
      SELECT receipt_number, created_at, email_sent, email_sent_at
      FROM receipts
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, clientId);

    // Get all audit logs
    const auditLogs = await prisma.$queryRawUnsafe<Array<{
      action: string;
      message: string;
      created_at: Date;
      user_email: string | null;
      user_first_name: string | null;
      user_last_name: string | null;
    }>>(`
      SELECT 
        al.action,
        al.message,
        al.created_at,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.client_id = $1
      ORDER BY al.created_at DESC
      LIMIT 1000
    `, clientId);

    const reportData = {
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        createdAt: client.created_at,
      },
      receipts: receipts.map(r => ({
        receiptNumber: r.receipt_number,
        createdAt: r.created_at,
        emailSent: r.email_sent,
        emailSentAt: r.email_sent_at,
      })),
      auditLog: auditLogs.map(log => ({
        action: log.action,
        message: log.message,
        actor: log.user_email 
          ? `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || log.user_email
          : "System",
        actorEmail: log.user_email,
        timestamp: log.created_at,
      })),
      generatedAt: new Date(),
    };

    // Generate PDF
    const pdfStream = await renderToStream(AuditTrailReportPDF({ reportData }));

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="audit-trail-${clientId}-${new Date().toISOString().split("T")[0]}.pdf"`
    );

    return new NextResponse(pdfStream as unknown as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating audit trail report:", errorMessage);
    
    if (errorMessage === "Unauthorized" || errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: errorMessage || "Failed to generate report" },
      { status: 500 }
    );
  }
}

