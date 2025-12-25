import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InviteUpdatePage({ params }: Props) {
  const { token } = await params;

  // Try to get or create test invite first
  let invite: Awaited<ReturnType<typeof getOrCreateTestInvite>> | Awaited<ReturnType<typeof lookupClientInvite>> | null = await getOrCreateTestInvite(token);

  // If not a test code, do normal lookup - use raw SQL first
  if (!invite) {
    try {
      // Try raw SQL first
      const rawResult = await prisma.$queryRaw<Array<{
        id: string,
        clientId:string,
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
          ci.client_id,
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
          clientId: row.client_id,
          email: row.email,
          token: row.token,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
          createdAt: row.createdAt,
          client: {
            id: row.client_id,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            dateOfBirth: row.dateOfBirth,
          },
        };
      }
    } catch (sqlError: unknown) {
      const message = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Invite update page: Raw SQL failed, trying Prisma:", message);
      // Fallback to Prisma
      try {
        // Try both possible model names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((prisma as any).client_invites) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((prisma as any).clientInvite) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          invite = await (prisma as any).clientInvite.findUnique({
            where: { token },
            include: { client: true },
          });
        }
      } catch (prismaError: unknown) {
        const prismaMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
        console.error("Invite update page: Prisma also failed:", prismaMessage);
        // invite remains null
      }
    }
  }

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900 mb-2">Invalid Link</h1>
            <p className="text-sm text-slateui-600 mb-6">
              This invitation link is invalid or has been revoked. Please contact your attorney for a new link.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Redirect to new QR update page for versioned updates
  // This preserves backward compatibility while using the new versioned system
  redirect(`/qr-update/${token}`);
}

