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
      id: string;
      receipt_number: string;
      client_id: string;
      created_at: Date;
      email_sent: boolean;
      email_sent_at: Date | null;
    }>>(`
      SELECT 
        r.id,
        r.receipt_number,
        r.client_id,
        r.created_at,
        r.email_sent,
        r.email_sent_at
      FROM receipts r
      WHERE r.client_id = $1
      ORDER BY r.created_at DESC
    `, clientId);

    // Get all audit logs for this client
    const auditLogs = await prisma.$queryRawUnsafe<Array<{
      id: string;
      user_id: string | null;
      org_id: string | null;
      client_id: string | null;
      policy_id: string | null;
      action: string;
      message: string;
      created_at: Date;
      user_email: string | null;
      user_first_name: string | null;
      user_last_name: string | null;
    }>>(`
      SELECT 
        al.id,
        al.user_id,
        al.org_id,
        al.client_id,
        al.policy_id,
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

    // Get client policies for receipt hashing
    const policies = await prisma.$queryRawUnsafe<Array<{
      id: string;
      policy_number: string | null;
    }>>(`
      SELECT id, policy_number
      FROM policies
      WHERE client_id = $1
    `, clientId);

    // Generate hashes for receipts
    const receiptsWithHashes = receipts.map(receipt => {
      const hash = generateReceiptHash({
        receiptId: receipt.receipt_number,
        clientId: receipt.client_id,
        createdAt: receipt.created_at,
        policies: policies.map(p => ({ id: p.id, policyNumber: p.policy_number })),
      });
      return {
        id: receipt.id,
        receiptNumber: receipt.receipt_number,
        createdAt: receipt.created_at.toISOString(),
        emailSent: receipt.email_sent,
        emailSentAt: receipt.email_sent_at?.toISOString() || null,
        hash,
      };
    });

    // Generate hashes for audit logs
    const auditLogsWithHashes = auditLogs.map((log, index) => {
      const hash = generateAuditHash({
        id: log.id,
        action: log.action,
        message: log.message,
        userId: log.user_id,
        clientId: log.client_id,
        policyId: log.policy_id,
        createdAt: log.created_at,
        orgId: log.org_id,
      });
      return {
        id: log.id,
        action: log.action,
        message: log.message,
        actor: log.user_email 
          ? `${log.user_first_name || ""} ${log.user_last_name || ""}`.trim() || log.user_email
          : "System",
        actorEmail: log.user_email,
        timestamp: log.created_at.toISOString(),
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

