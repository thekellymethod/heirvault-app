import Link from "next/link";
import { getCurrentUserWithOrg } from "@/lib/authz";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InviteMemberForm } from "./_components/InviteMemberForm";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orgId } = await params;
  const { user: currentUser } = await getCurrentUserWithOrg();

  if (!currentUser) {
    redirect("/dashboard/organizations");
  }

  // Verify user is a member of this organization
  const { queryRaw } = await import("@/lib/db");
  
  type MembershipRow = {
    membership_id: string;
    membership_role: string;
    membership_createdAt: Date;
    org_id: string;
    org_name: string;
    org_slug: string;
    org_createdAt: Date;
  };

  const membershipResult = await queryRaw<MembershipRow>(`
    SELECT
      om.id as membership_id,
      om.role as membership_role,
      om.createdAt as membership_createdAt,
      o.id as org_id,
      o.name as org_name,
      o.slug as org_slug,
      o.createdAt as org_createdAt
    FROM org_members om
    INNER JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = $1 AND om.organization_id = $2
    LIMIT 1
  `, [currentUser.id, orgId]);

  if (!membershipResult || membershipResult.length === 0) {
    redirect("/dashboard/organizations");
  }

  const membershipRow = membershipResult[0];
  if (!membershipRow) {
    redirect("/dashboard/organizations");
  }

  const membership = {
    id: membershipRow.membership_id,
    role: membershipRow.membership_role,
    createdAt: membershipRow.membership_createdAt,
    organizations: {
      id: membershipRow.org_id,
      name: membershipRow.org_name,
      slug: membershipRow.org_slug,
      createdAt: membershipRow.org_createdAt,
    },
  };

  const isOwner = membership.role === "OWNER";
  const canManageMembers = isOwner || membership.role === "ATTORNEY";

  // Get all members of this organization
  type MemberRow = {
    membership_id: string;
    membership_role: string;
    membership_createdAt: Date;
    user_id: string;
    user_email: string;
    user_firstName: string | null;
    user_lastName: string | null;
  };

  const membersResult = await queryRaw<MemberRow>(`
    SELECT
      om.id as membership_id,
      om.role as membership_role,
      om.createdAt as membership_createdAt,
      u.id as user_id,
      u.email as user_email,
      u."firstName" as user_firstName,
      u."lastName" as user_lastName
    FROM org_members om
    INNER JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = $1
    ORDER BY om.createdAt DESC
  `, [orgId]);

  type MemberListItem = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    joinedAt: Date;
    isCurrentUser: boolean;
  };

  const membersList: MemberListItem[] = (membersResult || []).map((m: MemberRow): MemberListItem => ({
    id: m.user_id,
    email: m.user_email,
    firstName: m.user_firstName,
    lastName: m.user_lastName,
    role: m.membership_role,
    joinedAt: m.membership_createdAt,
    isCurrentUser: m.user_id === currentUser.id,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/organizations"
            className="text-sm text-slateui-600 hover:text-ink-900 mb-2 inline-block"
          >
            ← Back to Organizations
          </Link>
          <h1 className="text-2xl font-semibold text-ink-900">
            {membership.organizations.name}
          </h1>
          <p className="text-sm text-slateui-600">
            Manage organization settings and team members.
          </p>
        </div>
        <Link href={`/dashboard/settings/org`}>
          <Button variant="outline">Settings</Button>
        </Link>
      </div>

      {/* Organization Info */}
      <div className="rounded-xl border border-slateui-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">
          Organization Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slateui-600">Slug</div>
            <div className="text-ink-900">{membership.organizations.slug}</div>
          </div>
          <div>
            <div className="text-slateui-600">Created</div>
            <div className="text-ink-900">
              {new Date(membership.organizations.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-slateui-600">Your Role</div>
            <div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  membership.role === "OWNER"
                    ? "bg-purple-100 text-purple-700"
                    : membership.role === "ATTORNEY"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slateui-100 text-slateui-700"
                }`}
              >
                {membership.role}
              </span>
            </div>
          </div>
          <div>
            <div className="text-slateui-600">Total Members</div>
            <div className="text-ink-900">{membersList.length}</div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="rounded-xl border border-slateui-200 bg-white">
        <div className="flex items-center justify-between border-b border-slateui-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-ink-900">Team Members</h2>
          {canManageMembers && (
            <InviteMemberForm organizationId={orgId} />
          )}
        </div>

        <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900">
          <div className="col-span-4">Member</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2 text-right">Joined</div>
        </div>

        <div className="divide-y divide-slateui-200">
          {membersList.map((member: MemberListItem) => (
            <div
              key={member.id}
              className="px-4 py-4 hover:bg-slateui-50 transition-colors"
            >
              <div className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-4">
                  <div className="text-sm font-medium text-ink-900">
                    {member.firstName} {member.lastName}
                    {member.isCurrentUser && (
                      <span className="ml-2 text-xs text-slateui-600">(You)</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      member.role === "OWNER"
                        ? "bg-purple-100 text-purple-700"
                        : member.role === "ATTORNEY"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slateui-100 text-slateui-700"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
                <div className="col-span-4 text-sm text-ink-900">
                  {member.email}
                </div>
                <div className="col-span-2 text-right text-xs text-slateui-600">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
