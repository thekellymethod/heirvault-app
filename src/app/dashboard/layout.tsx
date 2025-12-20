import * as React from "react";
import { DashboardWrapper } from "./_components/DashboardWrapper";
import { getCurrentUser } from "@/lib/utils/clerk";

export const runtime = "nodejs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clerk middleware handles authentication - ensure user exists in database
  // This will create the user if they don't exist yet
  await getCurrentUser();
  
  return <DashboardWrapper>{children}</DashboardWrapper>;
}
