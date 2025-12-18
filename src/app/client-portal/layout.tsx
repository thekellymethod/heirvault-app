import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/clerk";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default async function ClientPortalLayout({ children }: { children: ReactNode }) {
  try {
    await requireAuth("client");
  } catch (e: any) {
    const { getCurrentUser } = await import("@/lib/utils/clerk");
    const user = await getCurrentUser();
    
    if (!user) {
      // Not authenticated, go to client login
      redirect("/client/login");
    } else if (user.role === "attorney" || user.role === "admin") {
      // User is an attorney, redirect to dashboard
      redirect("/dashboard");
    } else {
      // User exists but doesn't have client role, go to login
      redirect("/client/login");
    }
  }

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slateui-200 bg-paper-50/95 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Logo size="sm" showTagline={false} className="flex-row gap-2" href="/client-portal" />
                <span className="text-lg font-semibold text-ink-900">Client Portal</span>
              </div>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/client-portal/policies"
                className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
              >
                Policies
              </Link>
              <Link
                href="/client-portal/beneficiaries"
                className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
              >
                Beneficiaries
              </Link>
              <UserButton afterSignOutUrl="/" />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
