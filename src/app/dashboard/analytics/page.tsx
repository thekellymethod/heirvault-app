import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentUserWithOrg } from "@/lib/authz";

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { user, orgMember } = await getCurrentUserWithOrg();
  if (!user || !orgMember) redirect("/dashboard");

  const orgId = orgMember.organizationId;

  const [
    clientCount,
    policyCount,
    activePolicyCount,
    beneficiaryCount,
    recentInvites,
  ] = await Promise.all([
    prisma.client.count({ where: { orgId } }),
    prisma.policy.count({
      where: { client: { orgId } },
    }),
    prisma.policy.count({
      where: { client: { orgId }, status: "ACTIVE" },
    }),
    prisma.beneficiary.count({
      where: { client: { orgId } },
    }),
    prisma.clientInvite.findMany({
      where: { client: { orgId } },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="p-8 mx-auto max-w-5xl space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-50">
          Firm analytics
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of registries managed under your firm.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[11px] text-slate-400">Clients</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {clientCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[11px] text-slate-400">Policies</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {policyCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Active:{" "}
            <span className="text-emerald-300">{activePolicyCount}</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[11px] text-slate-400">Beneficiaries</div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {beneficiaryCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[11px] text-slate-400">Completion</div>
          <div className="mt-1 text-xl font-semibold text-emerald-300">
            {clientCount === 0
              ? "—"
              : `${Math.round(
                  (activePolicyCount / Math.max(clientCount, 1)) * 100,
                )}%`}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Approx. active policies per client
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-100 mb-2">
          Recent client invitations
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
          {recentInvites.length === 0 ? (
            <p className="text-slate-400">No invitations sent yet.</p>
          ) : (
            <ul className="space-y-1">
              {recentInvites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between border-b border-slate-800/60 pb-1 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="text-slate-100">
                      {inv.client.firstName} {inv.client.lastName}
                    </div>
                    <div className="text-slate-500">
                      {inv.email} · {inv.token.slice(0, 8)}…
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {inv.createdAt.toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {inv.usedAt && (
                      <span className="ml-1 text-emerald-300">
                        · accepted
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

