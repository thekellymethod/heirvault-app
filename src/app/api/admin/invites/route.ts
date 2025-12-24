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
    const user = await requireAuth("attorney");

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const archived = searchParams.get("archived") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Search invitation codes by token, email, or client name
    let invites: Array<{
      id: string;
      token: string;
      clientId: string;
      clientName: string;
      email: string;
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
          WHERE 
            (LOWER(ci.token) LIKE LOWER($1) OR
             LOWER(ci.email) LIKE LOWER($1) OR
             LOWER(c.first_name) LIKE LOWER($1) OR
             LOWER(c.last_name) LIKE LOWER($1))
            ${archivedClause}
          ORDER BY ci.created_at DESC
          LIMIT $2
          OFFSET $3
        `, searchPattern, limit, offset);

        invites = invitesResult.map(row => ({
          id: row.id,
          token: row.token,
          clientId: row.client_id,
          clientName: `${row.first_name} ${row.last_name}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.created_at,
          isArchived: row.used_at !== null,
          isExpired: new Date(row.expires_at) < new Date(),
        }));
      } else {
        // Get all invites if no search query
        const archivedClause = archived ? "WHERE ci.used_at IS NOT NULL" : "";
        const invitesResult = await prisma.$queryRawUnsafe<Array<{
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

        invites = invitesResult.map(row => ({
          id: row.id,
          token: row.token,
          clientId: row.client_id,
          clientName: `${row.first_name} ${row.last_name}`,
          email: row.email,
          phone: row.phone,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.created_at,
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
      console.error("Admin invites search: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      
      // Fallback to Prisma
      const invitesData = await prisma.clientInvite.findMany({
        where: archived ? { usedAt: { not: null } } : undefined,
        include: {
          clients: true,
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      });

      const invites = invitesData.map(invite => ({
        id: invite.id,
        token: invite.token,
        clientId: invite.clientId,
        clientName: `${invite.clients.firstName} ${invite.clients.lastName}`,
        email: invite.email,
        phone: invite.clients.phone,
        expiresAt: invite.expiresAt,
        usedAt: invite.usedAt,
        createdAt: invite.createdAt,
        isArchived: invite.usedAt !== null,
        isExpired: new Date(invite.expiresAt) < new Date(),
      }));

      return NextResponse.json({
        invites,
        total: invites.length,
        limit,
        offset,
      });
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
    const user = await requireAuth("attorney");
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
      console.error("Archive invite: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      
      // Fallback to Prisma
      await prisma.clientInvite.updateMany({
        where: { token, usedAt: null },
        data: { usedAt: new Date() },
      });

      return NextResponse.json({ success: true });
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
