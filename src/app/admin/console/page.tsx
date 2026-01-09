import "server-only";
import { requireAdmin } from "@/lib/auth/guards";
import ConsoleClient from "./ConsoleClient";
import ConsoleGuide from "./ConsoleGuide";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminBanner from "@/components/AdminBanner";

export const runtime = "nodejs";

export default async function AdminConsolePage() {
  // Server gate (UI can't be bypassed)
  await requireAdmin();

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Admin Banner - Always at the very top */}
      <AdminBanner />
      <div className="py-6">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-sm text-slateui-600 hover:text-ink-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Admin Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="text-sm text-slateui-600 hover:text-ink-900 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-slateui-300">|</span>
                <span className="text-sm text-ink-900 font-medium">Console</span>
              </div>
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
                Admin Console
              </h1>
              <p className="text-slateui-600">
                Restricted command palette. Whitelisted actions only. Every command is audited.
              </p>
            </div>
          </div>

          {/* Instruction Guide */}
          <div className="mb-6">
            <ConsoleGuide />
          </div>

          {/* Console Interface */}
          <div className="card p-6">
            <ConsoleClient />
          </div>

          <p className="mt-4 text-xs text-slateui-600">
            Kill switch: <code className="rounded bg-slateui-100 px-1.5 py-0.5 text-ink-900">ADMIN_CONSOLE_ENABLED</code>
          </p>
        </div>
      </div>
    </div>
  );
}

