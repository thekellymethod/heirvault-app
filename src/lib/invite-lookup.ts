import { prisma } from "./db";

/**
 * Looks up a client invite by token using raw SQL first, with Prisma fallback
 * This avoids Prisma client model name issues
 */
export async function lookupClientInvite(token: string) {
  // Try raw SQL first
  try {
    const rawResult = await prisma.$queryRaw<Array<{
      id: string,
      clientId: string,
      email: string,
      token: string,
      expires_at: Date;
      used_at: Date | null;
      createdAt: Date;
      firstName: string,
      lastName: string,
      phone: string | null;
      dateOfBirth: Date | null;
    }>>`
      SELECT 
        ci.id,
        ci.client_id as "clientId",
        ci.email,
        ci.token,
        ci.expires_at,
        ci.used_at,
        ci.createdAt,
        c.firstName,
        c.lastName,
        c.phone,
        c.dateOfBirth
      FROM client_invites ci
      INNER JOIN clients c ON c.id = ci.client_id
      WHERE ci.token = ${token}
      LIMIT 1
    `;

    if (rawResult && rawResult.length > 0) {
      const row = rawResult[0];
      return {
        id: row.id,
        clientId: row.clientId,
        email: row.email,
        token: row.token,
        expiresAt: row.expires_at,
        usedAt: row.used_at,
        createdAt: row.createdAt,
        client: {
          id: row.clientId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.dateOfBirth,
        },
      };
    }
  } catch (sqlError: unknown) {
    const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
    console.error("lookupClientInvite: Raw SQL failed, trying Prisma:", sqlErrorMessage);
    // Fallback to Prisma
    try {
      // Try both possible model names
      const prismaAny = prisma as unknown as Record<string, unknown>;
      if (prismaAny.client_invites && typeof prismaAny.client_invites === "object") {
        const clientInvites = prismaAny.client_invites as { findUnique: (args: { where: { token: string }; include: { clients: boolean } }) => Promise<unknown> };
        const prismaInvite = await clientInvites.findUnique({
          where: { token },
          include: { clients: true },
        });
        if (prismaInvite && typeof prismaInvite === "object" && "clients" in prismaInvite) {
          return {
            ...(prismaInvite as Record<string, unknown>),
            client: (prismaInvite as { clients: unknown }).clients,
          };
        }
      } else if (prismaAny.clientInvite && typeof prismaAny.clientInvite === "object") {
        const clientInvite = prismaAny.clientInvite as { findUnique: (args: { where: { token: string }; include: { client: boolean } }) => Promise<unknown> };
        return await clientInvite.findUnique({
          where: { token },
          include: { client: true },
        });
      }
    } catch (prismaError: unknown) {
      const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
      console.error("lookupClientInvite: Prisma also failed:", prismaErrorMessage);
      return null;
    }
  }
  
  return null;
}

