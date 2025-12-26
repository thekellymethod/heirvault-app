import { auth } from "@clerk/nextjs/server";
import { prisma, type OrgMember, type User } from "@/lib/db";
import type { OrgRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { TeamManagement } from "./TeamManagement";

export default async function TeamPage() {
  // Clerk middleware handles authentication - no need for manual redirects
  const { userId } = await auth();

  // Get user with org memberships using raw SQL
  let user: {
    id: string,
    email: string,
    firstName: string | null;
    lastName: string | null;
  } | null = null;
  let organizationId: string | null = null;

  try {
    const userResult = await prisma.$queryRaw<Array<{
      user_id: string,
      user_email: string,
      user_firstName: string | null;
      user_lastName: string | null;
      org_id: string | null;
      org_role: string | null;
    }>>`
      SELECT 
        u.id as user_id,
        u.email as user_email,
        u.firstName as user_firstName,
        u.lastName as user_lastName,
        om.organization_id as org_id,
        om.role as org_role
      FROM users u
      LEFT JOIN org_members om ON om.user_id = u.id
      WHERE u."clerkId" = ${userId}
      LIMIT 1
    `;

    if (userResult && userResult.length > 0) {
      const row = userResult[0];
      user = {
        id: row.user_id,
        email: row.user_email,
        firstName: row.user_firstName,
        lastName: row.user_lastName,
      };
      organizationId = row.org_id || null;
    }
  } catch (sqlError: unknown) {
    const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
    console.error("Team page: Failed to load user:", sqlErrorMessage);
    redirect("/dashboard");
  }

  if (!user) redirect("/dashboard");

  // If no organization, show message to create one
  if (!organizationId) {
    return (
      <main className="p-8 max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold text-ink-900">
          Firm team
        </h1>
        <p className="text-sm text-slateui-600">
          Team management is available when you create or join an organization.
        </p>
        <div className="rounded-xl border border-slateui-200 bg-white p-6 text-center">
          <p className="text-ink-900 mb-4">
            You need to create or join an organization to manage team members.
          </p>
          <a
            href="/dashboard/settings/org"
            className="btn-primary inline-block"
          >
            Create Organization
          </a>
        </div>
      </main>
    );
  }

  // Use raw SQL as primary method since Prisma client may have issues
  type TeamMember = OrgMember & {
    user: Pick<User, "id" | "email" | "firstName" | "lastName">;
  };
  let members: TeamMember[] = [];
  try {
    const rawMembers = await prisma.$queryRaw<Array<{
      id: string,
      user_id: string,
      organization_id: string,
      role: string,
      createdAt: Date;
      updated_at: Date;
      user_email: string,
      user_firstName: string | null;
      user_lastName: string | null;
    }>>`
      SELECT 
        om.id,
        om.user_id,
        om.organization_id,
        om.role,
        om.createdAt,
        om.updated_at,
        u.email as user_email,
        u.firstName as user_firstName,
        u.lastName as user_lastName
      FROM org_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = ${organizationId}
      ORDER BY om.createdAt ASC
    `;

      members = rawMembers.map(m => ({
        id: m.id,
        userId: m.user_id,
        organizationId: m.organization_id,
        role: m.role as OrgRole,
        createdAt: m.createdAt,
        updatedAt: m.updated_at,
        user: {
          id: m.user_id,
          email: m.user_email,
          firstName: m.user_firstName,
          lastName: m.user_lastName,
        },
      }));
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Team page: Raw SQL failed:", sqlErrorMessage);
      // Return empty array if query fails
      members = [];
    }

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-ink-900">
        Firm team
      </h1>
      <p className="text-sm text-slateui-600">
        Manage who has access to this firm&apos;s clients and registries.
      </p>
      <TeamManagement members={members as Parameters<typeof TeamManagement>[0]['members']} currentUserId={user.id} />
    </main>
  );
}

