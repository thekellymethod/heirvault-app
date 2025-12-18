import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { DashboardLayout } from "../../_components/DashboardLayout"
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Firm Settings</h1>
            <p className="mt-2 text-base text-slateui-600">
              These details appear in client invitations and PDF registry exports.
            </p>
          </div>
          <a
            href="/dashboard"
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Dashboard
          </a>
        </div>
        <OrgSettingsForm org={orgMember.organization} />
      </div>
    </DashboardLayout>
  )
}

