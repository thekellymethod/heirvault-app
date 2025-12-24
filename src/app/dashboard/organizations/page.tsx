import Link from "next/link";
import { db, organizations, orgMembers, eq, desc, sql } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { getCurrentUserWithOrg } from "@/lib/authz";
import { Button } from "@/components/ui/button";

export default async function OrganizationsPage() {
  await requireAuth();
  const { user: currentUser } = await getCurrentUserWithOrg();

  // Get all organizations the user is a member of
  const userOrganizations = await db
    .select({
      organization: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      },
      membership: {
        role: orgMembers.role,
        createdAt: orgMembers.createdAt,
      },
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(eq(orgMembers.userId, currentUser.id))
    .orderBy(desc(orgMembers.createdAt));

  // Get member counts for each organization
  const orgsWithCounts = await Promise.all(
    userOrganizations.map(async (org) => {
      const memberCountResult = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM org_members
        WHERE organization_id = ${org.organization.id}
      `);
      const memberCount = (memberCountResult.rows[0] as { count: number })?.count || 0;

      return {
        ...org.organization,
        role: org.membership.role,
        memberCount,
        joinedAt: org.membership.createdAt,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Organizations</h1>
          <p className="text-sm text-slateui-600">
            Manage your organizations and team members.
          </p>
        </div>
        {orgsWithCounts.length === 0 && (
          <Link href="/dashboard/organizations/new">
            <Button size="lg">Create Organization</Button>
          </Link>
        )}
      </div>

      {orgsWithCounts.length === 0 ? (
        <div className="rounded-xl border border-slateui-200 bg-white p-8 text-center">
          <p className="text-slateui-600 mb-4">
            You&apos;re not a member of any organizations yet.
          </p>
          <Link href="/dashboard/organizations/new">
            <Button>Create Your First Organization</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slateui-200 bg-white">
          <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900">
            <div className="col-span-4">Organization</div>
            <div className="col-span-2">Your Role</div>
            <div className="col-span-2">Members</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-slateui-200">
            {orgsWithCounts.map((org) => (
              <div
                key={org.id}
                className="px-4 py-4 hover:bg-slateui-50 transition-colors"
              >
                <div className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-4">
                    <div className="text-sm font-medium text-ink-900">
                      {org.name}
                    </div>
                    <div className="text-xs text-slateui-600">Slug: {org.slug}</div>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        org.role === "OWNER"
                          ? "bg-purple-100 text-purple-700"
                          : org.role === "ATTORNEY"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slateui-100 text-slateui-700"
                      }`}
                    >
                      {org.role}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-ink-900">
                    {org.memberCount} {org.memberCount === 1 ? "member" : "members"}
                  </div>
                  <div className="col-span-2 text-xs text-slateui-600">
                    {new Date(org.joinedAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-2 text-right">
                    <Link
                      href={`/dashboard/organizations/${org.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

