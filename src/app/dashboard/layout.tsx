import * as React from "react";
import { redirect } from "next/navigation";
import { DashboardWrapper } from "./_components/DashboardWrapper";
import { getCurrentUser } from "@/lib/utils/clerk";
import { db, orgMembers, eq } from "@/lib/db";

export const runtime = "nodejs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/attorney/sign-in");

  // Must have an org membership, otherwise onboard
  const orgRows = await db
    .select({ organizationId: orgMembers.organizationId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, user.id))
    .limit(1);

  if (!orgRows || orgRows.length === 0) redirect("/attorney/onboard");

  return <DashboardWrapper>{children}</DashboardWrapper>;
}
