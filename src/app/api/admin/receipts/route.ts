import { NextRequest, NextResponse } from "next/server";
;
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
        const { queryRaw } = await import("@/lib/db");
        const receiptsResult = await queryRaw<{
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
        }>(`
          SELECT 
            ci.id,
            ci."clientId",
            ci.token,
            ci.email,
            ci.expires_at,
            ci.used_at,
            ci."createdAt",
            c."firstName",
            c."lastName",
            c.phone,
            CONCAT('REC-', ci."clientId", '-', EXTRACT(EPOCH FROM ci."createdAt")::bigint) as receipt_id
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci."clientId"
          WHERE 
            (LOWER(ci.token) LIKE LOWER($1) OR
             LOWER(ci.email) LIKE LOWER($1) OR
             LOWER(c."firstName") LIKE LOWER($1) OR
             LOWER(c."lastName") LIKE LOWER($1) OR
             CONCAT('REC-', ci."clientId", '-', EXTRACT(EPOCH FROM ci."createdAt")::bigint) LIKE $1)
            ${archivedClause}
          ORDER BY ci."createdAt" DESC
          LIMIT $2
          OFFSET $3
        `, [searchPattern, limit, offset]);

        receipts = (receiptsResult || []).map((row) => ({
          id: row.id,
          receiptId: row.receipt_id ?? `REC-${row.clientId}-${Math.floor((row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).getTime() / 1000)}`,
          token: row.token,
          clientId: row.clientId,
          clientName: `${row.firstName} ${row.lastName}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
          usedAt: row.used_at ? (row.used_at instanceof Date ? row.used_at : new Date(row.used_at)) : null,
          createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
          isArchived: row.used_at !== null,
        }));
      } else {
        // Get all receipts if no search query
        const { queryRaw: queryRaw2 } = await import("@/lib/db");
        const archivedClause = archived ? "WHERE ci.used_at IS NOT NULL" : "";
        const receiptsResult = await queryRaw2<{
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
        }>(`
          SELECT 
            ci.id,
            ci."clientId",
            ci.token,
            ci.email,
            ci.expires_at,
            ci.used_at,
            ci."createdAt",
            c."firstName",
            c."lastName",
            c.phone
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci."clientId"
          ${archivedClause}
          ORDER BY ci."createdAt" DESC
          LIMIT $1
          OFFSET $2
        `, [limit, offset]);

        receipts = (receiptsResult || []).map((row) => ({
          id: row.id,
          receiptId: `REC-${row.clientId}-${Math.floor((row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).getTime() / 1000)}`,
          token: row.token,
          clientId: row.clientId,
          clientName: `${row.firstName} ${row.lastName}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
          usedAt: row.used_at ? (row.used_at instanceof Date ? row.used_at : new Date(row.used_at)) : null,
          createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
          isArchived: row.used_at !== null,
        }));
      }

      // Get total count for pagination
      const { queryRaw: queryRaw3 } = await import("@/lib/db");
      const archivedClause = archived ? "WHERE ci.used_at IS NOT NULL" : "";
      const countResult = await queryRaw3<{ count: number }>(`
        SELECT COUNT(*)::int as count
        FROM client_invites ci
        ${archivedClause}
      `, []);

      const total = Number((countResult?.[0] as { count: number } | undefined)?.count || 0);

      // Get archived count (total archived receipts, not just current page)
      const { queryRaw: queryRaw4 } = await import("@/lib/db");
      const archivedCountResult = await queryRaw4<{ count: number }>(`
        SELECT COUNT(*)::int as count
        FROM client_invites ci
        WHERE ci.used_at IS NOT NULL
      `, []);
      const archivedCount = Number((archivedCountResult?.[0] as { count: number } | undefined)?.count || 0);

      return NextResponse.json({
        receipts,
        total,
        archivedCount,
        limit,
        offset,
      });
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Admin receipts search: Raw SQL failed:", sqlErrorMessage);
      
      // Retry with queryRaw
      const { queryRaw: queryRaw5 } = await import("@/lib/db");
      const invitesResult = await queryRaw5<{
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
      }>(`
        SELECT 
          ci.id,
          ci."clientId",
          ci.token,
          ci.email,
          ci.expires_at,
          ci.used_at,
          ci."createdAt",
          c."firstName",
          c."lastName",
          c.phone
        FROM client_invites ci
        INNER JOIN clients c ON c.id = ci."clientId"
        ${archived ? "WHERE ci.used_at IS NOT NULL" : ""}
        ORDER BY ci."createdAt" DESC
        LIMIT $1
        OFFSET $2
      `, [limit, offset]);

      const receipts = (invitesResult || []).map((invite) => ({
        id: invite.id,
        receiptId: `REC-${invite.clientId}-${Math.floor((invite.createdAt instanceof Date ? invite.createdAt : new Date(invite.createdAt)).getTime() / 1000)}`,
        token: invite.token,
        clientId: invite.clientId,
        clientName: `${invite.firstName} ${invite.lastName}`,
        email: invite.email,
        phone: invite.phone,
        expiresAt: invite.expires_at instanceof Date ? invite.expires_at : new Date(invite.expires_at),
        usedAt: invite.used_at ? (invite.used_at instanceof Date ? invite.used_at : new Date(invite.used_at)) : null,
        createdAt: invite.createdAt instanceof Date ? invite.createdAt : new Date(invite.createdAt),
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
      const { update: updateInvite, findMany: findManyInvites } = await import("@/lib/db");
      
      // Archive by marking as used
      if (token) {
        await updateInvite("client_invites", { token }, {
          usedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Record<string, unknown>);
      } else if (receiptId) {
        // Extract client ID from receipt ID
        const match = receiptId.match(/^REC-([^-]+)-/);
        if (match) {
          const clientId = match[1];
          const invites = await findManyInvites("client_invites", {
            where: { clientId, usedAt: null },
            orderBy: { column: "createdAt", ascending: false },
            limit: 1,
          });
          if (invites && invites.length > 0 && invites[0]) {
            const invite = invites[0] as { id: string };
            await updateInvite("client_invites", { id: invite.id }, {
              usedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Record<string, unknown>);
          }
        }
      }

      return NextResponse.json({ success: true });
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Archive receipt: Update failed:", sqlErrorMessage);
      
      // Retry with updateInvite
      const { update: updateInvite2 } = await import("@/lib/db");
      if (token) {
        await updateInvite2("client_invites", { token }, {
          usedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Record<string, unknown>);
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
