import { prisma } from "@/lib/db"
import { auth } from "@clerk/nextjs/server"
import { InvitePortal } from "./InvitePortal"

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: { client: true },
  })

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <h1 className="text-lg font-semibold">Invalid link</h1>
          <p className="mt-2 text-sm text-slate-300">
            This invitation link is invalid or has been revoked. Please
            contact your attorney for a new link.
          </p>
        </div>
      </main>
    )
  }

  const now = new Date()
  if (invite.usedAt || invite.expiresAt < now) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <h1 className="text-lg font-semibold">Link expired</h1>
          <p className="mt-2 text-sm text-slate-300">
            This invitation link has expired or has already been used. Please
            contact your attorney to request a new link.
          </p>
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
