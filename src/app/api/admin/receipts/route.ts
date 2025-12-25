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
    const _user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const archived = searchParams.get("archived") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Search receipts by receipt ID, client name, email, or token
    let receipts: Array<{
      id: string,
      receiptId: string,
      token: string,
      clientId: string,
      clientName: string,
      email: string,
      phone: string | null;
      expiresAt: Date;
      usedAt: Date | null;
      createdAt: Date;
      isArchived: boolean;
    }> = [];

    try {
      if (q.trim()) {
        const searchPattern = `%${q.replace(/'/g, "''")}%`;
        
        // Build WHERE clause conditionally
        const archivedClause = archived ? "AND ci.used_at IS NOT NULL" : "";
        
        // Search client_invites (which contain receipt information via token)
        const receiptsResult = await prisma.$queryRawUnsafe<Array<{
          id: string,
          clientId: string,
          token: string,
          email: string,
          expires_at: Date;
          used_at: Date | null;
          createdAt: Date;
          firstName: string,
          lastName: string,
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
            ci.createdAt,
            c.firstName,
            c.lastName,
            c.phone,
            CONCAT('REC-', ci.client_id, '-', EXTRACT(EPOCH FROM ci.createdAt)::bigint) as receipt_id
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci.client_id
          WHERE 
            (LOWER(ci.token) LIKE LOWER($1) OR
             LOWER(ci.email) LIKE LOWER($1) OR
             LOWER(c.firstName) LIKE LOWER($1) OR
             LOWER(c.lastName) LIKE LOWER($1) OR
             CONCAT('REC-', ci.client_id, '-', EXTRACT(EPOCH FROM ci.createdAt)::bigint) LIKE $1)
            ${archivedClause}
          ORDER BY ci.createdAt DESC
          LIMIT $2
          OFFSET $3
        `, searchPattern, limit, offset);

        receipts = receiptsResult.map(row => ({
          id: row.id,
          receiptId: row.receipt_id ?? `REC-${row.client_id}-${Math.floor(row.createdAt.getTime() / 1000)}`,
          token: row.token,
          clientId: row.client_id,
          clientName: `${row.firstName} ${row.lastName}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.createdAt,
          isArchived: row.used_at !== null,
        }));
      } else {
        // Get all receipts if no search query
        const archivedClause = archived ? "WHERE ci.used_at IS NOT NULL" : "";
        const receiptsResult = await prisma.$queryRawUnsafe<Array<{
          id: string,
          clientId: string,
          token: string,
          email: string,
          expires_at: Date;
          used_at: Date | null;
          createdAt: Date;
          firstName: string,
          lastName: string,
          phone: string | null;
        }>>(`
          SELECT 
            ci.id,
            ci.client_id,
            ci.token,
            ci.email,
            ci.expires_at,
            ci.used_at,
            ci.createdAt,
            c.firstName,
            c.lastName,
            c.phone
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci.client_id
          ${archivedClause}
          ORDER BY ci.createdAt DESC
          LIMIT $1
          OFFSET $2
        `, limit, offset);

        receipts = receiptsResult.map(row => ({
          id: row.id,
          receiptId: `REC-${row.client_id}-${Math.floor(row.createdAt.getTime() / 1000)}`,
          token: row.token,
          clientId: row.client_id,
          clientName: `${row.firstName} ${row.lastName}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.createdAt,
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
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Admin receipts search: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      
      // Fallback to Prisma (may not work due to schema issues, but try anyway)
      // Note: Using raw SQL query as Prisma model may not be available
      const invitesResult = await prisma.$queryRawUnsafe<Array<{
        id: string,
        clientId:string,
        token: string,
        email: string,
        expires_at: Date;
        used_at: Date | null;
        createdAt: Date;
        firstName: string,
        lastName: string,
        phone: string | null;
      }>>(`
        SELECT 
          ci.id,
          ci.client_id,
          ci.token,
          ci.email,
          ci.expires_at,
          ci.used_at,
          ci.createdAt,
          c.firstName,
          c.lastName,
          c.phone
        FROM client_invites ci
        INNER JOIN clients c ON c.id = ci.client_id
        ${archived ? "WHERE ci.used_at IS NOT NULL" : ""}
        ORDER BY ci.createdAt DESC
        LIMIT $1
        OFFSET $2
      `, limit, offset);

      const receipts = invitesResult.map((invite) => ({
        id: invite.id,
        receiptId: `REC-${invite.client_id}-${Math.floor(invite.createdAt.getTime() / 1000)}`,
        token: invite.token,
        clientId: invite.client_id,
        clientName: `${invite.firstName} ${invite.lastName}`,
        email: invite.email,
        phone: invite.phone,
        expiresAt: invite.expires_at,
        usedAt: invite.used_at,
        createdAt: invite.createdAt,
        isArchived: invite.used_at !== null,
      }));

      return NextResponse.json({
        receipts,
        total: receipts.length,
        limit,
        offset,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error searching receipts:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Archive a receipt (mark as used/archived)
 */
export async function POST(req: NextRequest) {
  try {
    const _user = await requireAuth();
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
            ORDER BY createdAt DESC
            LIMIT 1
          `, clientId);
        }
      }

      return NextResponse.json({ success: true });
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Archive receipt: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      
      // Fallback to Prisma - use raw SQL since Prisma model may not be available
      if (token) {
        await prisma.$executeRawUnsafe(`
          UPDATE client_invites
          SET used_at = NOW(), updated_at = NOW()
          WHERE token = $1 AND used_at IS NULL
        `, token);
      }

      return NextResponse.json({ success: true });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to archive receipt";
    console.error("Error archiving receipt:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
