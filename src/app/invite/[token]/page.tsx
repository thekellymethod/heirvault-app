import { auth } from "@clerk/nextjs/server";
import { InvitePortal } from "./InvitePortal";
import { redirect } from "next/navigation";
import { getOrCreateTestInvite } from "@/lib/test-invites";

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

  // Helper to convert date string/Date to Date
  const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    return null;
  };

  // Try to get or create test invite first
  const testInvite = await getOrCreateTestInvite(token);
  let invite: ClientInvite | null = null;

  // Convert test invite to ClientInvite format if it exists
  if (testInvite) {
    const expiresAt = toDate(testInvite.expiresAt);
    const usedAt = toDate(testInvite.usedAt);
    const createdAt = toDate(testInvite.createdAt);
    const dateOfBirth = toDate(testInvite.client.dateOfBirth);

    if (expiresAt && createdAt) {
      invite = {
        id: testInvite.id,
        clientId: testInvite.clientId,
        email: testInvite.email,
        token: testInvite.token,
        expiresAt,
        usedAt,
        createdAt,
        client: {
          id: testInvite.client.id,
          firstName: testInvite.client.firstName,
          lastName: testInvite.client.lastName,
          email: testInvite.client.email,
          phone: testInvite.client.phone,
          dateOfBirth,
        },
      };
    }
  }

  // If not a test code, do normal lookup
  if (!invite) {
    try {
      const { queryRaw } = await import("@/lib/db");

      type InviteRow = {
        id: string;
        clientId: string;
        email: string;
        token: string;
        expires_at: Date;
        used_at: Date | null;
        createdAt: Date;
        firstName: string;
        lastName: string;
        phone: string | null;
        dateOfBirth: Date | null;
      };

      const rawResult = await queryRaw<InviteRow>(`
        SELECT 
          ci.id,
          ci."clientId" as "clientId",
          ci.email,
          ci.token,
          ci.expires_at,
          ci.used_at,
          ci."createdAt",
          c."firstName",
          c."lastName",
          c.phone,
          c."dateOfBirth"
        FROM client_invites ci
        INNER JOIN clients c ON c.id = ci."clientId"
        WHERE ci.token = $1
        LIMIT 1
      `, [token]);

      if (rawResult && rawResult.length > 0) {
        const row = rawResult[0];
        if (row) {
          const expiresAt = toDate(row.expires_at);
          const usedAt = toDate(row.used_at);
          const createdAt = toDate(row.createdAt);
          const dateOfBirth = toDate(row.dateOfBirth);

          if (expiresAt && createdAt) {
            invite = {
              id: row.id,
              clientId: row.clientId,
              email: row.email,
              token: row.token,
              expiresAt,
              usedAt,
              createdAt,
              client: {
                id: row.clientId,
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email,
                phone: row.phone,
                dateOfBirth,
              },
            };
          }
        }
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Invite page: Query failed:", sqlErrorMessage);
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
