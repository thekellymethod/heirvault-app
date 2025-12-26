import { prisma } from "@/lib/db"
import { auth } from "@clerk/nextjs/server"
import { InvitePortal } from "./InvitePortal"
import { redirect } from "next/navigation"
import { getOrCreateTestInvite } from "@/lib/test-invites"

interface Props {
  params: Promise<{ token: string }>
}

type ClientInvite = {
  id: string,
  clientId: string,
  email: string,
  token: string,
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  client: {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phone: string | null;
    dateOfBirth: Date | null;
  };
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  // Try to get or create test invite first
  let invite: ClientInvite | null = await getOrCreateTestInvite(token)

  // If not a test code, do normal lookup - use raw SQL first
  if (!invite) {
    try {
      // Try raw SQL first
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
        invite = {
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
      console.error("Invite page: Raw SQL failed:", sqlErrorMessage);
      // invite remains null
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
