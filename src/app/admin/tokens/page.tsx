import { requireAdmin } from "@/lib/auth/guards";
import TokensClient from "./TokensClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const runtime = "nodejs";

export default async function AdminTokensPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slateui-600 hover:text-ink-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Admin Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">API Tokens</h1>
          <p className="text-slateui-600">
            Manage API tokens for machine-to-machine authentication. Tokens are hashed and never stored in plaintext.
          </p>
        </div>

        <div className="card p-4 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-2">
            <div>
              <p className="text-sm font-medium text-ink-900 mb-1">Security Notice</p>
              <p className="text-sm text-slateui-600">
                Tokens are shown in plaintext only once when created or rotated. Store them securely. Revoked tokens cannot be restored.
              </p>
            </div>
          </div>
        </div>

        <TokensClient />
      </div>
    </div>
  );
}

