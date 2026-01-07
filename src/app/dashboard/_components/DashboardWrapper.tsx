"use client";

import { DashboardLayout } from "./DashboardLayout";
import { GlobalKeyboardShortcuts } from "@/components/KeyboardShortcuts";

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalKeyboardShortcuts />
      <DashboardLayout>{children}</DashboardLayout>
    </>
  );
}










