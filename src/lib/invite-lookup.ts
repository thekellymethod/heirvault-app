import { prisma } from "./db";

/**
 * Looks up a client invite by token using raw SQL first, with Prisma fallback
 * This avoids Prisma client model name issues
 */
export async function lookupClientInvite(token: string) {
  // Try raw SQL first
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
      phone: string | null;
      date_of_birth: Date | null;
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
        c.last_name,
        c.phone,
        c.date_of_birth
      FROM client_invites ci
      INNER JOIN clients c ON c.id = ci.client_id
      WHERE ci.token = ${token}
      LIMIT 1
    `;

    if (rawResult && rawResult.length > 0) {
      const row = rawResult[0];
      return {
        id: row.id,
        clientId: row.client_id,
        email: row.email,
        token: row.token,
        expiresAt: row.expires_at,
        usedAt: row.used_at,
        createdAt: row.created_at,
        client: {
          id: row.client_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.date_of_birth,
        },
      };
    }
  } catch (sqlError: any) {
    console.error("lookupClientInvite: Raw SQL failed, trying Prisma:", sqlError.message);
    // Fallback to Prisma
    try {
      // Try both possible model names
      if ((prisma as any).client_invites) {
        const prismaInvite = await (prisma as any).client_invites.findUnique({
          where: { token },
          include: { clients: true },
        });
        if (prismaInvite) {
          return {
            ...prismaInvite,
            client: prismaInvite.clients,
          };
        }
      } else if ((prisma as any).clientInvite) {
        return await (prisma as any).clientInvite.findUnique({
          where: { token },
          include: { client: true },
        });
      }
    } catch (prismaError: any) {
      console.error("lookupClientInvite: Prisma also failed:", prismaError.message);
      return null;
    }
  }
  
  return null;
}

