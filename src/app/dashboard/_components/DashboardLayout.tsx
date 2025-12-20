"use client";

import { SidebarNav } from "./SidebarNav";
import { GlobalSearch } from "../GlobalSearch";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper-50">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-slateui-200 bg-white lg:block shadow-sm">
        <div className="flex h-16 items-center gap-3 border-b border-slateui-200 px-6 bg-paper-50">
          <Logo size="sm" showTagline={false} className="flex-row" href="/dashboard" />
        </div>
        <div className="p-4">
          <SidebarNav />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slateui-200 bg-paper-50/95 backdrop-blur shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              {/* Mobile menu button - can be added later */}
              <div className="lg:hidden">
                <Logo size="sm" showTagline={false} className="flex-row" href="/dashboard" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
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


