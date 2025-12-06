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
          organization: true,
        },
      },
    },
  });

  const orgMember = user?.orgMemberships?.[0];
  if (!user || !orgMember) redirect("/dashboard");

  const members = await prisma.orgMember.findMany({
    where: { organizationId: orgMember.organizationId },
    include: {
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

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

