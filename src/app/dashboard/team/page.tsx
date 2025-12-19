import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TeamManagement } from "./TeamManagement";

export default async function TeamPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      orgMemberships: {
        include: {
          organizations: true,
        },
      },
    },
  });

  const orgMember = user?.orgMemberships?.[0];
  if (!user || !orgMember) redirect("/dashboard");

  // Get organization ID - handle both possible field names
  const organizationId = (orgMember as any).organizationId || orgMember.organizations?.id;
  if (!organizationId) {
    redirect("/dashboard");
  }

  // Use raw SQL as primary method since Prisma client may have issues
  let members: any[] = [];
  try {
    const rawMembers = await prisma.$queryRaw<Array<{
      id: string;
      user_id: string;
      organization_id: string;
      role: string;
      created_at: Date;
      user_email: string;
      user_first_name: string | null;
      user_last_name: string | null;
    }>>`
      SELECT 
        om.id,
        om.user_id,
        om.organization_id,
        om.role,
        om.created_at,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM org_members om
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = ${organizationId}
      ORDER BY om.created_at ASC
    `;

      members = rawMembers.map(m => ({
        id: m.id,
        userId: m.user_id,
        organizationId: m.organization_id,
        role: m.role,
        createdAt: m.created_at,
        user: {
          id: m.user_id,
          email: m.user_email,
          firstName: m.user_first_name,
          lastName: m.user_last_name,
        },
      }));
    } catch (sqlError: any) {
      console.error("Team page: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma - try both possible model names
      try {
        // Try org_members first (snake_case from schema)
        if ((prisma as any).org_members) {
          const prismaMembers = await (prisma as any).org_members.findMany({
            where: { organization_id: organizationId },
            include: {
              users: true,
            },
            orderBy: { created_at: "asc" },
          });
          members = prismaMembers;
        } else if ((prisma as any).orgMember) {
          // Try orgMember (camelCase)
          const prismaMembers = await (prisma as any).orgMember.findMany({
            where: { organizationId: organizationId },
            include: {
              user: true,
            },
            orderBy: { createdAt: "asc" },
          });
          members = prismaMembers;
        } else {
          throw new Error("Neither org_members nor orgMember model found");
        }
      } catch (prismaError: any) {
        console.error("Team page: Prisma also failed:", prismaError.message);
        // Return empty array if both fail
        members = [];
      }
    }

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-slate-50">
        Firm team
      </h1>
      <p className="text-sm text-slate-400">
        Manage who has access to this firm&apos;s clients and registries.
      </p>
      <TeamManagement members={members} currentUserId={user.id} />
    </main>
  );
}

