import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { OrgSettingsForm } from "./OrgSettingsForm"

export default async function OrgSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      orgMemberships: {
        include: {
          organization: true,
        },
      },
    },
  })

  const orgMember = user?.orgMemberships?.[0]
  if (!user || !orgMember) redirect("/dashboard")

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-slate-50">
        Firm settings
      </h1>
      <p className="text-sm text-slate-400">
        These details appear in client invitations and PDF registry exports.
      </p>
      <OrgSettingsForm org={orgMember.organization} />
    </main>
  )
}

