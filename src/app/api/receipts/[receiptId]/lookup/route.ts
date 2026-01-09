import { NextRequest, NextResponse } from "next/server";
;

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
    let invite: {
      id: string,
      clientId: string,
      email: string,
      token: string,
      expiresAt: Date;
      usedAt: Date | null;
      createdAt: Date;
      client: {
        firstName: string,
        lastName: string,
      };
    } | null = null;
    try {
      const { queryRaw } = await import("@/lib/db");
      const rawResult = await queryRaw<{
        id: string;
        clientId: string;
        email: string;
        token: string;
        expires_at: Date;
        used_at: Date | null;
        createdAt: Date;
        firstName: string;
        lastName: string;
      }>(`
        SELECT 
          ci.id,
          ci."clientId",
          ci.email,
          ci.token,
          ci.expires_at,
          ci.used_at,
          ci."createdAt",
          c."firstName",
          c."lastName"
        FROM client_invites ci
        INNER JOIN clients c ON c.id = ci."clientId"
        WHERE ci."clientId" = $1 AND ci.used_at IS NOT NULL
        ORDER BY ci."createdAt" DESC
        LIMIT 1
      `, [clientId]);

      if (rawResult && rawResult.length > 0) {
        const row = rawResult[0];
        if (row) {
          invite = {
            id: row.id,
            clientId: row.clientId,
            email: row.email,
            token: row.token,
            expiresAt: row.expires_at,
            usedAt: row.used_at,
            createdAt: row.createdAt,
            client: {
              firstName: row.firstName,
              lastName: row.lastName,
            },
          };
        }
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Receipt lookup: SQL failed:", sqlErrorMessage);
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
    const _message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error looking up receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

