import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
;

type LayoutProps = { children: ReactNode };

export const runtime = "nodejs";

export default async function AttorneyOnboardLayout({ children }: LayoutProps) {
  const { userId } = await auth();

  // Must be signed in to onboard
  if (!userId) redirect("/attorney/sign-in");

  // Must be provisioned in DB (your single gate is /attorney/sign-up/complete)
  const { findUnique } = await import("@/lib/db");
  type UserRecord = { id: string; clerkId: string };
  const dbUser = await findUnique<UserRecord>("users", { clerkId: userId });

  if (!dbUser) redirect("/attorney/sign-up/complete");

  return <>{children}</>;
}
