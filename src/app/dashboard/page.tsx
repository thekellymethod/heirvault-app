import { requireAuth } from "@/lib/utils/clerk";

export default async function DashboardHomePage() {
  const user = await requireAuth("attorney");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-2xl border border-slate-800 bg-[#111827]/40 p-6 shadow">
        <h1 className="text-2xl font-semibold tracking-tight">
          Attorney Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Signed in as {user.email}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-black/20 p-4">
            <div className="text-sm font-medium">Clients</div>
            <div className="mt-1 text-xs text-slate-400">
              Manage client registries, invites, and access grants.
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-black/20 p-4">
            <div className="text-sm font-medium">Billing</div>
            <div className="mt-1 text-xs text-slate-400">
              Plans, limits, subscription status, invoices.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
