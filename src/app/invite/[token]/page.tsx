import { prisma } from "@/lib/db"
import { auth } from "@clerk/nextjs/server"
import { InvitePortal } from "./InvitePortal"
import Link from "next/link"
import { XCircle } from "lucide-react"
import { getOrCreateTestInvite } from "@/lib/test-invites"

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  // Try to get or create test invite first
  let invite = await getOrCreateTestInvite(token)

  // If not a test code, do normal lookup
  if (!invite) {
    invite = await prisma.clientInvite.findUnique({
      where: { token },
      include: { client: true },
    })
  }

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4">
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
    )
  }

  const now = new Date()
  // Allow expired invites to still be used for updates
  // Only block if it's way past expiration (more than 30 days)
  const daysSinceExpiration = (now.getTime() - invite.expiresAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceExpiration > 30) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <XCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900 mb-2">Link Expired</h1>
            <p className="text-sm text-slateui-600 mb-6">
              This invitation link has expired. Please contact your attorney to request a new link.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    )
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
