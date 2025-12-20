import * as React from "react";
import { DashboardWrapper } from "./_components/DashboardWrapper";
import { getCurrentUser } from "@/lib/utils/clerk";

export const runtime = "nodejs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  // 1) Must be signed in
  if (!userId) redirect("/attorney/sign-in");

  // 2) Must be provisioned (DB user exists)
  const [dbUser] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  if (!dbUser) redirect("/attorney/sign-up/complete");

  // 3) Must have an org membership, otherwise onboard
  const orgRows = await db.select({ organizationId: orgMembers.organizationId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, dbUser.id))
    .limit(1);

  if (!orgRows || orgRows.length === 0) redirect("/attorney/onboard");

  return <>{children}</>;
}
