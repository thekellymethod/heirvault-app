import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

type LayoutProps = { children: ReactNode };

export const runtime = "nodejs";

export default async function AttorneyOnboardLayout({ children }: LayoutProps) {
  const { userId } = auth();

  // Must be signed in to onboard
  if (!userId) redirect("/attorney/sign-in");

  // Must be provisioned in DB (your single gate is /attorney/sign-up/complete)
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });

  if (!dbUser) redirect("/attorney/sign-up/complete");

  return <>{children}</>;
}
