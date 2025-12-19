import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();

  // 1) Must be signed in
  if (!userId) redirect("/attorney/sign-in");

  // 2) Must be provisioned (DB user exists)
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });

  if (!dbUser) redirect("/attorney/sign-up/complete");

  // 3) Must have an org membership, otherwise onboard
  const orgRows = await prisma.$queryRaw<Array<{ organization_id: string }>>`
    SELECT organization_id
    FROM org_members
    WHERE user_id = ${dbUser.id}
    LIMIT 1
  `;

  if (!orgRows || orgRows.length === 0) redirect("/attorney/onboard");

  return <>{children}</>;
}
