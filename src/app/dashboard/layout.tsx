import * as React from "react";
import { DashboardWrapper } from "./_components/DashboardWrapper";

export const runtime = "nodejs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clerk middleware handles authentication
  // Don't block rendering with getCurrentUser() - let pages handle their own user fetching
  // This prevents hanging if there are database connection issues
  
  return <DashboardWrapper>{children}</DashboardWrapper>;
}

