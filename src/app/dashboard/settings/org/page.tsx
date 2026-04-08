import { auth } from "@clerk/nextjs/server"

import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/utils/clerk"
import { OrgSettingsForm } from "./OrgSettingsForm"

export default async function OrgSettingsPage() {
  // Clerk middleware handles authentication - no need for manual redirects
  await auth()

  // Use getCurrentUser to ensure user exists in database
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect("/dashboard")

  // Use raw SQL first for reliability to get org membership
  const user = currentUser;
  let orgMember: {
    organizationId: string,
    role: string,
    organizations: {
      id: string,
      name: string,
      slug: string,
      addressLine1: string | null;
      addressLine2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
      phone: string | null;
      logoUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  } | null = null;

  // Use findMany/findUnique — queryRaw() calls RPC exec_raw_sql, which is not installed on default Supabase projects.
  const { findMany, findUnique } = await import("@/lib/db");
  type OrgMemberRow = {
    organization_id: string;
    role: string;
  };
  const members = await findMany<OrgMemberRow>("org_members", {
    where: { userId: currentUser.id },
    limit: 1,
  });
  const member = members[0] ?? null;

  if (member) {
    type OrgRow = {
      id: string;
      name: string;
      slug: string;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
      phone: string | null;
      logo_url: string | null;
      created_at: string;
      updated_at: string;
    };
    const org = await findUnique<OrgRow>("organizations", {
      id: member.organization_id,
    });
    if (org) {
      orgMember = {
        organizationId: member.organization_id,
        role: member.role,
        organizations: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          addressLine1: org.address_line1,
          addressLine2: org.address_line2,
          city: org.city,
          state: org.state,
          postalCode: org.postal_code,
          country: org.country,
          phone: org.phone,
          logoUrl: org.logo_url,
          createdAt: new Date(org.created_at),
          updatedAt: new Date(org.updated_at),
        },
      };
    }
  }

  if (!user) redirect("/dashboard")

  // If no organization, show create form
  if (!orgMember) {
    return (
      <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Create Organization</h1>
            <p className="mt-2 text-base text-slateui-600">
              Create an organization to manage team members and billing.
            </p>
          </div>
          <div className="card p-6">
            <p className="text-slateui-600 mb-4">
              {"You don't have an organization yet. Create one to get started."}
            </p>
            <a
              href="/attorney/onboard"
              className="btn-primary inline-block"
            >
              Create Organization
            </a>
          </div>
        </div>
    )
  }

  return (
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
  )
}

