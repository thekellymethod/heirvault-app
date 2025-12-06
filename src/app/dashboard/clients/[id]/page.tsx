import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAttorneyOrOwner } from "@/lib/authz";
import { redirect } from "next/navigation";
import { InviteClientButton } from "./_components/InviteClientButton";
import { ClientActivityFeed } from "./ClientActivityFeed";
import { audit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  await requireAttorneyOrOwner(); // ensure only attorneys/owners see this

  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "overview";

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      policies: {
        include: {
          insurer: true,
          beneficiaries: {
            include: {
              beneficiary: true,
            },
          },
        },
      },
      beneficiaries: true,
    },
  });

  if (!client) {
    return (
      <main className="p-8">
        <p className="text-sm text-slate-400">Client not found.</p>
      </main>
    );
  }

  // Fire and forget; no need to await for UX, but we can await in v1
  await audit(AuditAction.CLIENT_VIEWED, {
    clientId: client.id,
    message: `Client detail viewed for ${client.firstName} ${client.lastName}`,
  });

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-sm text-slate-400">{client.email}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/clients/${client.id}/summary-pdf`}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
          >
            Download summary PDF
          </a>
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
          >
            Edit
          </Link>
          <InviteClientButton
            clientId={client.id}
            defaultEmail={client.email}
          />
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b border-slate-800">
        <div className="flex gap-4 text-xs">
          {[
            { id: "overview", label: "Overview" },
            { id: "activity", label: "Activity" },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <Link
                key={t.id}
                href={`/dashboard/clients/${client.id}?tab=${t.id}`}
                className={`pb-2 ${
                  isActive
                    ? "text-emerald-300 border-b-2 border-emerald-400"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </section>

      {activeTab === "overview" && (
        <section className="space-y-6">

          {/* Policies */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-50">Policies</h2>
              <Link
                href={`/dashboard/clients/${client.id}/policies/new`}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
              >
                Add policy
              </Link>
            </div>
        {client.policies.length === 0 ? (
          <p className="text-sm text-slate-400">
            No policies recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {client.policies.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-50">
                      {p.insurer.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      Type: {p.policyType ?? 'N/A'}
                    </p>
                    {p.policyNumber && (
                      <p className="text-xs text-slate-500">
                        Policy #: {p.policyNumber}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <p>Created</p>
                    <p className="text-emerald-300">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {p.beneficiaries.length > 0 && (
                  <div className="mt-3 text-xs text-slate-300">
                    Beneficiaries:{' '}
                    {p.beneficiaries
                      .map((pb) => `${pb.beneficiary.firstName} ${pb.beneficiary.lastName}`)
                      .join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

          {/* Beneficiaries */}
          <section>
            <h2 className="text-lg font-semibold text-slate-50 mb-2">
              Beneficiaries
            </h2>
        {client.beneficiaries.length === 0 ? (
          <p className="text-sm text-slate-400">
            No beneficiaries recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {client.beneficiaries.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <p className="text-sm font-semibold text-slate-50">
                  {b.firstName} {b.lastName}
                </p>
                {b.relationship && (
                  <p className="text-xs text-slate-400">
                    Relationship: {b.relationship}
                  </p>
                )}
                {(b.email || b.phone) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {b.email && <>Email: {b.email}</>}
                    {b.phone && (
                      <>
                        {b.email && ' · '}Phone: {b.phone}
                      </>
                    )}
                  </p>
                )}
                {b.dateOfBirth && (
                  <p className="mt-1 text-xs text-slate-500">
                    DOB: {new Date(b.dateOfBirth).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        </section>
      </section>
      )}

      {activeTab === "activity" && (
        <ClientActivityFeed clientId={client.id} />
      )}
    </main>
  );
}

