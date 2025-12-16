import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export default async function ClientPoliciesPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId, orgId } = auth();
  if (!userId) throw new Error("UNAUTHORIZED");
  if (!orgId) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
        No organization selected. Create/select your firm organization in Clerk.
      </div>
    );
  }

  const clientId = params.id;

  const client = await prisma.client.findFirst({
    where: { id: clientId, orgId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!client) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
        Client not found (or not in this organization).
      </div>
    );
  }

  const policies = await prisma.policy.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      policyNumber: true,
      policyType: true,
      createdAt: true,
      insurer: {
        select: {
          name: true,
          contactPhone: true,
          contactEmail: true,
          website: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Policies</h1>
          <p className="text-sm text-slate-400">
            {client.firstName} {client.lastName} · {client.email}
          </p>
        </div>

        <Link
          href={`/dashboard/clients/${client.id}/policies/new`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-medium text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30"
        >
          Add policy
        </Link>
      </div>

      {policies.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
          No policies yet. Add the first policy to begin beneficiary tracking.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/policies/${p.id}`}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 hover:border-emerald-500/40 transition-colors"
            >
              <div className="text-sm font-semibold text-slate-100">
                {p.insurer?.name ?? "Unknown insurer"}
              </div>

              <div className="mt-2 text-xs text-slate-400">
                Policy #:{" "}
                <span className="text-slate-300">{p.policyNumber || "—"}</span>
              </div>

              <div className="mt-2 text-xs text-slate-400">
                Type: <span className="text-slate-300">{p.policyType || "—"}</span>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                Created: {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

