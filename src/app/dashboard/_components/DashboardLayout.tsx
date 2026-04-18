"use client";

import { SidebarNav } from "./SidebarNav";
import { GlobalSearch } from "../GlobalSearch";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import BillingBanner from "@/components/BillingBanner";
import AdminBanner from "@/components/AdminBanner";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper-50">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r lg:block shadow-sm" style={{ borderColor: "#D9E2EE", backgroundColor: "#FFFFFF" }}>
        <div className="flex min-h-14 items-center border-b px-4 py-3 bg-paper-50" style={{ borderColor: "#D9E2EE" }}>
          <Logo size="xs" showTagline={false} className="flex-row min-w-0" href="/dashboard" />
        </div>
        <div className="p-4">
          <SidebarNav />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Admin Banner - Always at the very top */}
        <AdminBanner />
        {/* Billing Banner */}
        <BillingBanner />

        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-paper-50/95 backdrop-blur shadow-sm" style={{ borderColor: "#D9E2EE" }}>
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0 lg:hidden">
                <Logo size="sm" showTagline={false} className="flex-row min-w-0" href="/dashboard" />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
              <div className="hidden min-w-0 max-w-md flex-1 sm:block">
                <GlobalSearch />
              </div>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-paper-50">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="min-h-[calc(100vh-8rem)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


