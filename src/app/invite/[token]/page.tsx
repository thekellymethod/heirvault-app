import { prisma } from "@/lib/db"
import { auth } from "@clerk/nextjs/server"
import { InvitePortal } from "./InvitePortal"
import { redirect } from "next/navigation"
import { getOrCreateTestInvite } from "@/lib/test-invites"

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  // Try to get or create test invite first
  let invite: any = await getOrCreateTestInvite(token)

  // If not a test code, do normal lookup - use raw SQL first
  if (!invite) {
    try {
      // Try raw SQL first
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
        invite = {
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
      console.error("Invite page: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        // Try both possible model names
        if ((prisma as any).client_invites) {
          const prismaInvite = await (prisma as any).client_invites.findUnique({
            where: { token },
            include: { clients: true },
          });
          if (prismaInvite) {
            invite = {
              ...prismaInvite,
              client: prismaInvite.clients,
            };
          }
        } else if ((prisma as any).clientInvite) {
          invite = await (prisma as any).clientInvite.findUnique({
            where: { token },
            include: { client: true },
          });
        }
      } catch (prismaError: any) {
        console.error("Invite page: Prisma also failed:", prismaError.message);
        // invite remains null
      }
    }
  }

  if (!invite) {
    redirect("/error?type=invalid_token");
  }

  const now = new Date()
  // Allow expired invites to still be used for updates
  // Only block if it's way past expiration (more than 30 days)
  const daysSinceExpiration = (now.getTime() - invite.expiresAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceExpiration > 30) {
    redirect("/error?type=expired_authorization");
  }

  const { userId } = await auth()

  return (
    <InvitePortal
      inviteId={invite.id}
      clientName={`${invite.client.firstName} ${invite.client.lastName}`}
      email={invite.email}
      token={invite.token}
      isAuthenticated={!!userId}
    />
  )
}
