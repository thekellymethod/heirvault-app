import { requireAuth } from "@/lib/utils/clerk";

export default async function ClientPortalHomePage() {
  const user = await requireAuth("client");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-2xl border border-slate-800 bg-[#111827]/40 p-6 shadow">
        <h1 className="text-2xl font-semibold tracking-tight">
          Client Portal
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Signed in as {user.email}
        </p>

        <div className="mt-6 grid gap-4">
          <div className="rounded-xl border border-slate-800 bg-black/20 p-4">
            <div className="text-sm font-medium">My Registry</div>
            <div className="mt-1 text-xs text-slate-400">
              Review policies and beneficiaries your attorney has on file.
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-black/20 p-4">
            <div className="text-sm font-medium">Invitations</div>
            <div className="mt-1 text-xs text-slate-400">
              Complete forms securely via invitation links.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
