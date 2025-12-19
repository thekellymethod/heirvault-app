import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/utils/clerk"
import { DashboardLayout } from "../../_components/DashboardLayout"
import { OrgSettingsForm } from "./OrgSettingsForm"

export default async function OrgSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  // Use getCurrentUser to ensure user exists in database
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect("/dashboard")

  // Use raw SQL first for reliability to get org membership
  let user: any = currentUser
  let orgMember: any = null
  
  try {
    // Try raw SQL first - it's more reliable when Prisma client is broken
    const rawResult = await prisma.$queryRaw<Array<{
      organization_id: string
      org_name: string
      org_role: string
      org_slug: string
      org_address_line1: string | null
      org_address_line2: string | null
      org_city: string | null
      org_state: string | null
      org_postal_code: string | null
      org_country: string | null
      org_phone: string | null
      org_logo_url: string | null
      org_created_at: Date
      org_updated_at: Date
    }>>`
      SELECT 
        om.organization_id,
        o.name as org_name,
        om.role as org_role,
        o.slug as org_slug,
        o.address_line1 as org_address_line1,
        o.address_line2 as org_address_line2,
        o.city as org_city,
        o.state as org_state,
        o.postal_code as org_postal_code,
        o.country as org_country,
        o.phone as org_phone,
        o.logo_url as org_logo_url,
        o.created_at as org_created_at,
        o.updated_at as org_updated_at
      FROM org_members om
      INNER JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = ${currentUser.id}
      LIMIT 1
    `
    
    if (rawResult && rawResult.length > 0) {
      const row = rawResult[0]
      orgMember = {
        organizations: {
          id: row.organization_id,
          name: row.org_name,
          slug: row.org_slug,
          addressLine1: row.org_address_line1,
          addressLine2: row.org_address_line2,
          city: row.org_city,
          state: row.org_state,
          postalCode: row.org_postal_code,
          country: row.org_country,
          phone: row.org_phone,
          logoUrl: row.org_logo_url,
          createdAt: row.org_created_at,
          updatedAt: row.org_updated_at,
        },
      }
    }
  } catch (sqlError: any) {
    console.error("Org settings page: Raw SQL failed, trying Prisma:", sqlError.message)
    // If raw SQL fails, try Prisma as fallback
    try {
      const userWithOrg = await prisma.user.findUnique({
        where: { id: currentUser.id },
        include: {
          orgMemberships: {
            include: {
              organizations: true,
            },
          },
        },
      })
      orgMember = userWithOrg?.orgMemberships?.[0]
    } catch (prismaError: any) {
      console.error("Org settings page: Prisma also failed:", prismaError.message)
      // If both fail, redirect to dashboard
      redirect("/dashboard")
    }
  }

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
        <OrgSettingsForm org={orgMember.organizations} />
      </div>
    </DashboardLayout>
  )
}

