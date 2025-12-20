import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/clerk";
import { DashboardLayout } from "../../_components/DashboardLayout";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  // Clerk middleware handles authentication - no need for manual redirects
  const { userId } = await auth();

  // Use getCurrentUser to ensure user exists in database
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/dashboard");

  // Use raw SQL first for reliability to get org membership
  let user: any = currentUser;
  let orgMember: any = null;
  
  try {
    // Try raw SQL first - it's more reliable when Prisma client is broken
    const rawResult = await prisma.$queryRaw<Array<{
      organization_id: string;
      org_name: string;
      org_role: string;
    }>>`
      SELECT 
        om.organization_id,
        o.name as org_name,
        om.role as org_role
      FROM org_members om
      INNER JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = ${currentUser.id}
      LIMIT 1
    `;
    
    if (rawResult && rawResult.length > 0) {
      const row = rawResult[0];
      orgMember = {
        organizations: {
          id: row.organization_id,
          name: row.org_name,
        },
      };
    }
  } catch (sqlError: any) {
    console.error("Profile page: Raw SQL failed, trying Prisma:", sqlError.message);
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
      });
      orgMember = userWithOrg?.orgMemberships?.[0];
    } catch (prismaError: any) {
      console.error("Profile page: Prisma also failed:", prismaError.message);
      // If both fail, redirect to dashboard
      redirect("/dashboard");
    }
  }

  if (!user || !orgMember) redirect("/dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Attorney Profile</h1>
            <p className="mt-2 text-base text-slateui-600">
              Manage your profile information and bar number.
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

        <ProfileForm user={user} organization={orgMember.organizations} />
      </div>
    </DashboardLayout>
  );
}

