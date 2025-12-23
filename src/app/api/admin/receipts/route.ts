import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

/**
 * Admin API for searching and archiving receipts
 * Only accessible to authenticated attorneys
 */
export async function GET(req: NextRequest) {
  try {
    // Require attorney authentication
    const user = await requireAuth("attorney");

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const archived = searchParams.get("archived") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Search receipts by receipt ID, client name, email, or token
    let receipts: any[] = [];

    try {
      if (q.trim()) {
        const searchPattern = `%${q.replace(/'/g, "''")}%`;
        
        // Build WHERE clause conditionally
        const archivedClause = archived ? "AND ci.used_at IS NOT NULL" : "";
        
        // Search client_invites (which contain receipt information via token)
        const receiptsResult = await prisma.$queryRawUnsafe<Array<{
          id: string;
          client_id: string;
          token: string;
          email: string;
          expires_at: Date;
          used_at: Date | null;
          created_at: Date;
          first_name: string;
          last_name: string;
          phone: string | null;
          receipt_id: string | null;
        }>>(`
          SELECT 
            ci.id,
            ci.client_id,
            ci.token,
            ci.email,
            ci.expires_at,
            ci.used_at,
            ci.created_at,
            c.first_name,
            c.last_name,
            c.phone,
            CONCAT('REC-', ci.client_id, '-', EXTRACT(EPOCH FROM ci.created_at)::bigint) as receipt_id
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci.client_id
          WHERE 
            (LOWER(ci.token) LIKE LOWER($1) OR
             LOWER(ci.email) LIKE LOWER($1) OR
             LOWER(c.first_name) LIKE LOWER($1) OR
             LOWER(c.last_name) LIKE LOWER($1) OR
             CONCAT('REC-', ci.client_id, '-', EXTRACT(EPOCH FROM ci.created_at)::bigint) LIKE $1)
            ${archivedClause}
          ORDER BY ci.created_at DESC
          LIMIT $2
          OFFSET $3
        `, searchPattern, limit, offset);

        receipts = receiptsResult.map(row => ({
          id: row.id,
          receiptId: row.receipt_id,
          token: row.token,
          clientId: row.client_id,
          clientName: `${row.first_name} ${row.last_name}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.created_at,
          isArchived: row.used_at !== null,
        }));
      } else {
        // Get all receipts if no search query
        const archivedClause = archived ? "WHERE ci.used_at IS NOT NULL" : "";
        const receiptsResult = await prisma.$queryRawUnsafe<Array<{
          id: string;
          client_id: string;
          token: string;
          email: string;
          expires_at: Date;
          used_at: Date | null;
          created_at: Date;
          first_name: string;
          last_name: string;
          phone: string | null;
        }>>(`
          SELECT 
            ci.id,
            ci.client_id,
            ci.token,
            ci.email,
            ci.expires_at,
            ci.used_at,
            ci.created_at,
            c.first_name,
            c.last_name,
            c.phone
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci.client_id
          ${archivedClause}
          ORDER BY ci.created_at DESC
          LIMIT $1
          OFFSET $2
        `, limit, offset);

        receipts = receiptsResult.map(row => ({
          id: row.id,
          receiptId: `REC-${row.client_id}-${Math.floor(row.created_at.getTime() / 1000)}`,
          token: row.token,
          clientId: row.client_id,
          clientName: `${row.first_name} ${row.last_name}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.created_at,
          isArchived: row.used_at !== null,
        }));
      }

      // Get total count for pagination
      const archivedClause = archived ? "WHERE ci.used_at IS NOT NULL" : "";
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
        SELECT COUNT(*)::int as count
        FROM client_invites ci
        ${archivedClause}
      `);

      const total = Number(countResult[0]?.count || 0);

      // Get archived count (total archived receipts, not just current page)
      const archivedCountResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`
        SELECT COUNT(*)::int as count
        FROM client_invites ci
        WHERE ci.used_at IS NOT NULL
      `);
      const archivedCount = Number(archivedCountResult[0]?.count || 0);

      return NextResponse.json({
        receipts,
        total,
        archivedCount,
        limit,
        offset,
      });
    } catch (sqlError: any) {
      console.error("Admin receipts search: Raw SQL failed, trying Prisma:", sqlError.message);
      
      // Fallback to Prisma (may not work due to schema issues, but try anyway)
      const invites = await prisma.clientInvite.findMany({
        where: archived ? { usedAt: { not: null } } : undefined,
        include: {
          clients: true,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      });

      const receipts = invites.map(invite => ({
        id: invite.id,
        receiptId: `REC-${invite.clientId}-${Math.floor(invite.createdAt.getTime() / 1000)}`,
        token: invite.token,
        clientId: invite.clientId,
        clientName: `${invite.clients.firstName} ${invite.clients.lastName}`,
        email: invite.email,
        phone: invite.clients.phone,
        expiresAt: invite.expiresAt,
        usedAt: invite.usedAt,
        createdAt: invite.createdAt,
        isArchived: invite.usedAt !== null,
      }));

      return NextResponse.json({
        receipts,
        total: receipts.length,
        limit,
        offset,
      });
    }
  } catch (error: any) {
    console.error("Error searching receipts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search receipts" },
      { status: 500 }
    );
  }
}

/**
 * Archive a receipt (mark as used/archived)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth("attorney");
    const body = await req.json();
    const { receiptId, token } = body;

    if (!receiptId && !token) {
      return NextResponse.json(
        { error: "Receipt ID or token is required" },
        { status: 400 }
      );
    }

    try {
      // Archive by marking as used
      if (token) {
        await prisma.$executeRawUnsafe(`
          UPDATE client_invites
          SET used_at = NOW(), updated_at = NOW()
          WHERE token = $1 AND used_at IS NULL
        `, token);
      } else if (receiptId) {
        // Extract client ID from receipt ID
        const match = receiptId.match(/^REC-([^-]+)-/);
        if (match) {
          const clientId = match[1];
          await prisma.$executeRawUnsafe(`
            UPDATE client_invites
            SET used_at = NOW(), updated_at = NOW()
            WHERE client_id = $1 AND used_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
          `, clientId);
        }
      }

      return NextResponse.json({ success: true });
    } catch (sqlError: any) {
      console.error("Archive receipt: Raw SQL failed, trying Prisma:", sqlError.message);
      
      // Fallback to Prisma
      if (token) {
        await prisma.clientInvite.updateMany({
          where: { token, usedAt: null },
          data: { usedAt: new Date() },
        });
      }

      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error("Error archiving receipt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to archive receipt" },
      { status: 500 }
    );
  }
}
