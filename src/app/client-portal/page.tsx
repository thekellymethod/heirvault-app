import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { audit } from "@/lib/audit"
import { AuditAction } from "@prisma/client"

export default async function ClientPortalOverviewPage() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      primaryClients: {
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
      },
    },
  })

  const client = user?.primaryClients[0]
  if (!client) {
    return (
      <div className="text-sm text-slate-300">
        We couldn&apos;t find a registry linked to your account.
      </div>
    )
  }

  await audit(AuditAction.CLIENT_VIEWED, {
    clientId: client.id,
    message: "Client accessed their own registry via client portal",
  })

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold">
          Welcome, {client.firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          This is your Life Insurance &amp; Beneficiary Registry. You can
          record which companies you have policies with and who you&apos;ve
          named as beneficiaries. Policy amounts are intentionally not stored
          here.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-xs text-slate-400">Total policies</div>
          <div className="mt-2 text-2xl font-semibold">
            {client.policies.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-xs text-slate-400">Total beneficiaries</div>
          <div className="mt-2 text-2xl font-semibold">
            {client.beneficiaries.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-xs text-slate-400">Registry status</div>
          <div className="mt-2 text-sm text-emerald-300">
            {client.policies.length === 0
              ? "Incomplete"
              : "In progress"}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Quick view
        </h2>
        {client.policies.length === 0 ? (
          <p className="text-xs text-slate-400">
            You haven&apos;t added any policies yet. Use the Policies tab to
            add your first insurer.
          </p>
        ) : (
          <div className="space-y-2">
            {client.policies.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold text-slate-50">
                      {p.insurer.name}
                    </div>
                    <div className="text-slate-400">
                      Type: {p.policyType ?? "N/A"}
                    </div>
                    {p.policyNumber && (
                      <div className="text-slate-500">
                        Policy #: {p.policyNumber}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    {p.beneficiaries.length > 0 ? (
                      <>
                        {p.beneficiaries.length} {p.beneficiaries.length === 1 ? 'beneficiary' : 'beneficiaries'}
                      </>
                    ) : (
                      <>No beneficiaries linked</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

