import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertAttorneyCanAccessClient } from "@/lib/authz";
import { generateAuditHash, generateReceiptHash } from "@/lib/audit-hash";

/**
 * Get receipts and audit trail for a client
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

    // Get all receipts for this client
    const receipts = await prisma.$queryRawUnsafe<Array<{
      id: string,
      receipt_number: string,
      clientId: string,
      createdAt: Date;
      email_sent: boolean;
      email_sent_at: Date | null;
    }>>(`
      SELECT 
        r.id,
        r.receipt_number,
        r.client_id,
        r.createdAt,
        r.email_sent,
        r.email_sent_at
      FROM receipts r
      WHERE r.client_id = $1
      ORDER BY r.createdAt DESC
    `, clientId);

    // Get all audit logs for this client
    const auditLogs = await prisma.$queryRawUnsafe<Array<{
      id: string,
      user_id: string | null;
      org_id: string | null;
      clientId:string | null;
      policy_id: string | null;
      action: string,
      message: string,
      createdAt: Date;
      user_email: string | null;
      user_firstName: string | null;
      user_lastName: string | null;
    }>>(`
      SELECT 
        al.id,
        al.user_id,
        al.org_id,
        al.client_id,
        al.policy_id,
        al.action,
        al.message,
        al.createdAt,
        u.email as user_email,
        u.firstName as user_firstName,
        u.lastName as user_lastName
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.client_id = $1
      ORDER BY al.createdAt DESC
      LIMIT 1000
    `, clientId);

    // Generate hashes for receipts
    // CRITICAL: Each receipt must use only the policies that existed at the time it was created
    // This ensures historical hash immutability for legal defensibility
    const receiptsWithHashes = await Promise.all(
      receipts.map(async (receipt) => {
        // Query only policies that existed at the time this receipt was created
        // This preserves historical accuracy - policies added/modified after receipt creation
        // will not affect the receipt's hash
        const policiesAtReceiptTime = await prisma.$queryRawUnsafe<Array<{
          id: string,
          policy_number: string | null;
        }>>(`
          SELECT id, policy_number
          FROM policies
          WHERE client_id = $1
            AND createdAt <= $2
          ORDER BY createdAt ASC
        `, clientId, receipt.createdAt);

        const hash = generateReceiptHash({
          receiptId: receipt.receipt_number,
          clientId: receipt.client_id,
          createdAt: receipt.createdAt,
          policies: policiesAtReceiptTime.map(p => ({ id: p.id, policyNumber: p.policy_number })),
        });

        return {
          id: receipt.id,
          receiptNumber: receipt.receipt_number,
          createdAt: receipt.createdAt.toISOString(),
          emailSent: receipt.email_sent,
          emailSentAt: receipt.email_sent_at?.toISOString() || null,
          hash,
        };
      })
    );

    // Generate hashes for audit logs
    const auditLogsWithHashes = auditLogs.map((log, index) => {
      const hash = generateAuditHash({
        id: log.id,
        action: log.action,
        message: log.message,
        userId: log.user_id,
        clientId: log.client_id,
        policyId: log.policy_id,
        createdAt: log.createdAt,
        orgId: log.org_id,
      });
      return {
        id: log.id,
        action: log.action,
        message: log.message,
        actor: log.user_email 
          ? `${log.user_firstName || ""} ${log.user_lastName || ""}`.trim() || log.user_email
          : "System",
        actorEmail: log.user_email,
        timestamp: log.createdAt.toISOString(),
        policyId: log.policy_id,
        hash,
      };
    });

    return NextResponse.json({
      receipts: receiptsWithHashes,
      auditLog: auditLogsWithHashes,
      summary: {
        totalReceipts: receiptsWithHashes.length,
        totalAuditEntries: auditLogsWithHashes.length,
        firstEntry: auditLogsWithHashes.length > 0 
          ? auditLogsWithHashes[auditLogsWithHashes.length - 1].timestamp 
          : null,
        lastEntry: auditLogsWithHashes.length > 0 
          ? auditLogsWithHashes[0].timestamp 
          : null,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching receipts and audit trail:", errorMessage);
    
    if (errorMessage === "Unauthorized" || errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch receipts and audit trail" },
      { status: 500 }
    );
  }
}

