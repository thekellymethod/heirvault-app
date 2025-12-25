import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";

/**
 * Admin API for searching and archiving invitation codes
 * Only accessible to authenticated attorneys
 */
export async function GET(req: NextRequest) {
  try {
    // Require attorney authentication
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const archived = searchParams.get("archived") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Search invitation codes by token, email, or client name
    let invites: Array<{
      id: string,
      token: string,
      clientId: string,
      clientName: string,
      email: string,
      phone: string | null;
      expiresAt: Date;
      usedAt: Date | null;
      createdAt: Date;
      isArchived: boolean;
      isExpired: boolean;
    }> = [];

    try {
      if (q.trim()) {
        const searchPattern = `%${q.replace(/'/g, "''")}%`;
        const archivedClause = archived ? "AND ci.used_at IS NOT NULL" : "";
        
        const invitesResult = await prisma.$queryRawUnsafe<Array<{
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
            ci.clientId,
            ci.token,
            ci.email,
            ci.expires_at,
            ci.used_at,
            ci.createdAt,
            c.firstName,
            c.lastName,
            c.phone
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci.clientId
          WHERE 
            (LOWER(ci.token) LIKE LOWER($1) OR
             LOWER(ci.email) LIKE LOWER($1) OR
             LOWER(c.firstName) LIKE LOWER($1) OR
             LOWER(c.lastName) LIKE LOWER($1))
            ${archivedClause}
          ORDER BY ci.createdAt DESC
          LIMIT $2
          OFFSET $3
        `, searchPattern, limit, offset);

        invites = invitesResult.map(row => ({
          id: row.id,
          token: row.token,
          clientId: row.clientId,
          clientName: `${row.firstName} ${row.lastName}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.createdAt,
          isArchived: row.used_at !== null,
          isExpired: new Date(row.expires_at) < new Date(),
        }));
      } else {
        // Get all invites if no search query
        const archivedClause = archived ? "WHERE ci.used_at IS NOT NULL" : "";
        const invitesResult = await prisma.$queryRawUnsafe<Array<{
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
            ci.clientId,
            ci.token,
            ci.email,
            ci.expires_at,
            ci.used_at,
            ci.createdAt,
            c.firstName,
            c.lastName,
            c.phone
          FROM client_invites ci
          INNER JOIN clients c ON c.id = ci.clientId
          ${archivedClause}
          ORDER BY ci.createdAt DESC
          LIMIT $1
          OFFSET $2
        `, limit, offset);

        invites = invitesResult.map(row => ({
          id: row.id,
          token: row.token,
          clientId: row.clientId,
          clientName: `${row.firstName} ${row.lastName}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.createdAt,
          isArchived: row.used_at !== null,
          isExpired: new Date(row.expires_at) < new Date(),
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

      return NextResponse.json({
        invites,
        total,
        limit,
        offset,
      });
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Admin invites search: Raw SQL failed:", sqlErrorMessage);
      
      // Re-throw the error since we don't have a Prisma fallback
      throw sqlError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to search invites";
    console.error("Error searching invites:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Archive an invitation code (mark as used/archived)
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    try {
      // Archive by marking as used
      await prisma.$executeRawUnsafe(`
        UPDATE client_invites
        SET used_at = NOW(), updated_at = NOW()
        WHERE token = $1 AND used_at IS NULL
      `, token);

      return NextResponse.json({ success: true });
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Archive invite: Raw SQL failed:", sqlErrorMessage);
      
      // Re-throw the error since we don't have a Prisma fallback
      throw sqlError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to archive invite";
    console.error("Error archiving invite:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
