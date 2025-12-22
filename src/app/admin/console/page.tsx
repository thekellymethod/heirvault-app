import "server-only";
import { requireAdmin } from "@/lib/auth/guards";
import ConsoleClient from "./ConsoleClient";

export const runtime = "nodejs";

export default async function AdminConsolePage() {
  // Server gate (UI can't be bypassed)
  await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Console</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Restricted command palette. Whitelisted actions only. Every command is audited.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <ConsoleClient />
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Kill switch: <code className="rounded bg-zinc-900 px-1.5 py-0.5">ADMIN_CONSOLE_ENABLED</code>
        </p>
      </div>
    </div>
  );
}

