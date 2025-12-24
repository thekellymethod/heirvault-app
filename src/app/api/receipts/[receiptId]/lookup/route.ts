import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;

    // Extract client ID from receipt ID format: REC-{clientId}-{timestamp}
    const match = receiptId.match(/^REC-([^-]+)-/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid receipt ID format" },
        { status: 400 }
      );
    }

    const clientId = match[1];

    // Find the most recent invite for this client - use raw SQL first
    let invite: any = null;
    try {
      const rawResult = await prisma.$queryRaw<Array<{
        id: string;
        client_id: string;
        email: string;
        token: string;
        expires_at: Date;
        used_at: Date | null;
        created_at: Date;
        first_name: string;
        last_name: string;
      }>>`
        SELECT 
          ci.id,
          ci.client_id,
          ci.email,
          ci.token,
          ci.expires_at,
          ci.used_at,
          ci.created_at,
          c.first_name,
          c.last_name
        FROM client_invites ci
        INNER JOIN clients c ON c.id = ci.client_id
        WHERE ci.client_id = ${clientId} AND ci.used_at IS NOT NULL
        ORDER BY ci.created_at DESC
        LIMIT 1
      `;

      if (rawResult && rawResult.length > 0) {
        const row = rawResult[0];
        invite = {
          id: row.id,
          clientId: row.client_id,
          email: row.email,
          token: row.token,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.created_at,
          client: {
            firstName: row.first_name,
            lastName: row.last_name,
          },
        };
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Receipt lookup: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      // Fallback to Prisma
      try {
        const prismaAny = prisma as unknown as Record<string, unknown>;
        if (prismaAny.client_invites && typeof prismaAny.client_invites === "object") {
          const clientInvites = prismaAny.client_invites as { findFirst: (args: { where: unknown; orderBy: unknown; include: unknown }) => Promise<unknown> };
          const prismaInvite = await clientInvites.findFirst({
            where: {
              client_id: clientId,
              used_at: { not: null },
            },
            orderBy: { created_at: "desc" },
            include: { clients: true },
          });
          if (prismaInvite && typeof prismaInvite === "object" && "clients" in prismaInvite) {
            const inviteAny = prismaInvite as Record<string, unknown>;
            invite = {
              id: String(inviteAny.id || ""),
              clientId: String(inviteAny.client_id || ""),
              email: String(inviteAny.email || ""),
              token: String(inviteAny.token || ""),
              expiresAt: (inviteAny.expires_at as Date) || new Date(),
              usedAt: (inviteAny.used_at as Date | null) || null,
              createdAt: (inviteAny.created_at as Date) || new Date(),
              client: (inviteAny.clients as { firstName: string; lastName: string }) || { firstName: "", lastName: "" },
            };
          }
        }
      } catch (prismaError: unknown) {
        const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
        console.error("Receipt lookup: Prisma also failed:", prismaErrorMessage);
      }
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Receipt not found. Please check your receipt ID and try again." },
        { status: 404 }
      );
    }

    // Return token for update access
    return NextResponse.json({
      token: invite.token,
      clientName: `${invite.client.firstName} ${invite.client.lastName}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error looking up receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

