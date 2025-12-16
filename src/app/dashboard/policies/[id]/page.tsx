import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrgScope } from "@/lib/authz";
import PolicyBeneficiariesManager from "./_components/PolicyBeneficiariesManager";

export default async function PolicyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { scopeOrgId } = requireOrgScope();
  const policyId = params.id;

  const policy = await prisma.policy.findFirst({
    where: { id: policyId, client: { orgId: scopeOrgId } },
    select: {
      id: true,
      policyNumber: true,
      policyType: true,
      createdAt: true,
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      insurer: {
        select: {
          id: true,
          name: true,
          contactPhone: true,
          contactEmail: true,
          website: true,
        },
      },
    },
  });

  if (!policy) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
        Policy not found (or you don’t have access).
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Policy</h1>
          <p className="text-sm text-slate-400">
            {policy.insurer.name}
            {policy.policyNumber ? ` · #${policy.policyNumber}` : ""}
            {policy.policyType ? ` · ${policy.policyType}` : ""}
          </p>
          <div className="mt-2 text-xs text-slate-500">
            Client:{" "}
            <Link
              className="text-slate-300 hover:text-emerald-300"
              href={`/dashboard/clients/${policy.client.id}`}
            >
              {policy.client.firstName} {policy.client.lastName}
            </Link>{" "}
            · {policy.client.email}
          </div>
        </div>

        <Link
          href={`/dashboard/clients/${policy.client.id}/policies`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-700 bg-transparent px-4 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-emerald-300"
        >
          Back to client policies
        </Link>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="text-sm font-semibold text-slate-100">Insurer contact</div>
        <div className="mt-2 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Phone</div>
            <div>{policy.insurer.contactPhone || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Email</div>
            <div>{policy.insurer.contactEmail || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-slate-500">Website</div>
            <div>{policy.insurer.website || "—"}</div>
          </div>
        </div>
      </div>

      <PolicyBeneficiariesManager policyId={policy.id} clientId={policy.client.id} />
    </div>
  );
}
