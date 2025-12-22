import Link from "next/link";
import { db, organizations, orgMembers, users, eq, desc, and } from "@/lib/db";
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
  const [membership] = await db
    .select({
      organization: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      },
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(
      and(
        eq(orgMembers.userId, currentUser.id),
        eq(orgMembers.organizationId, orgId)
      )
    )
    .limit(1);

  if (!membership) {
    redirect("/dashboard/organizations");
  }

  const isOwner = membership.role === "OWNER";
  const canManageMembers = isOwner || membership.role === "ATTORNEY";

  // Get all members of this organization
  const members = await db
    .select({
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      },
      membership: {
        role: orgMembers.role,
        createdAt: orgMembers.createdAt,
      },
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.organizationId, orgId))
    .orderBy(desc(orgMembers.createdAt));

  const membersList = members.map((m) => ({
    id: m.user.id,
    email: m.user.email,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    role: m.membership.role,
    joinedAt: m.membership.createdAt,
    isCurrentUser: m.user.id === currentUser.id,
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
            {membership.organization.name}
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
            <div className="text-ink-900">{membership.organization.slug}</div>
          </div>
          <div>
            <div className="text-slateui-600">Created</div>
            <div className="text-ink-900">
              {new Date(membership.organization.createdAt).toLocaleDateString()}
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
          {membersList.map((member) => (
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
