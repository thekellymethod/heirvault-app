import Link from "next/link";
import { requireAuth } from "@/lib/utils/clerk";
import { getCurrentUserWithOrg } from "@/lib/authz";
import { Button } from "@/components/ui/button";

export default async function OrganizationsPage() {
  await requireAuth();
  const { user: currentUser } = await getCurrentUserWithOrg();

  if (!currentUser) {
    return <div>Unauthorized</div>;
  }

  // Get all organizations the user is a member of
  const { queryRaw } = await import("@/lib/db");

  type MembershipRow = {
    membership_id: string;
    membership_role: string;
    membership_createdAt: Date;
    membership_organizationId: string;
    org_id: string;
    org_name: string;
    org_slug: string;
    org_createdAt: Date;
    org_updatedAt: Date;
  };

  const userMembershipsResult = await queryRaw<MembershipRow>(`
    SELECT
      om.id as membership_id,
      om.role as membership_role,
      om.createdAt as membership_createdAt,
      om.organization_id as membership_organizationId,
      o.id as org_id,
      o.name as org_name,
      o.slug as org_slug,
      o.createdAt as org_createdAt,
      o.updated_at as org_updatedAt
    FROM org_members om
    INNER JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = $1
    ORDER BY om.createdAt DESC
  `, [currentUser.id]);

  type Membership = {
    id: string;
    role: string;
    createdAt: Date;
    organizationId: string;
    organizations: {
      id: string;
      name: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
    };
  };

  const userMemberships: Membership[] = (userMembershipsResult || []).map((row: MembershipRow): Membership => ({
    id: row.membership_id,
    role: row.membership_role,
    createdAt: row.membership_createdAt,
    organizationId: row.membership_organizationId,
    organizations: {
      id: row.org_id,
      name: row.org_name,
      slug: row.org_slug,
      createdAt: row.org_createdAt,
      updatedAt: row.org_updatedAt,
    },
  }));

  // Get member counts for each organization
  type OrgWithCount = {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
    role: string;
    memberCount: number;
    joinedAt: Date;
  };

  const orgsWithCounts: OrgWithCount[] = await Promise.all(
    userMemberships.map(async (membership: Membership): Promise<OrgWithCount> => {
      type CountRow = { count: bigint };
      const countResult = await queryRaw<CountRow>(`
        SELECT COUNT(*)::bigint as count
        FROM org_members
        WHERE organization_id = $1
      `, [membership.organizationId]);

      const memberCount = countResult && countResult.length > 0 && countResult[0]
        ? Number(countResult[0].count)
        : 0;

      return {
        id: membership.organizations.id,
        name: membership.organizations.name,
        slug: membership.organizations.slug,
        createdAt: membership.organizations.createdAt,
        updatedAt: membership.organizations.updatedAt,
        role: membership.role,
        memberCount,
        joinedAt: membership.createdAt,
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
            {orgsWithCounts.map((org: OrgWithCount) => (
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

