import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { NewClientPolicyForm } from "./NewClientPolicyForm"

export default async function ClientPoliciesPage() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      clientRecord: {
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
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  })

  const client = user?.clientRecord

  if (!client) {
    return (
      <div className="text-sm text-slate-300">
        No registry linked to your account.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">
            Your policies
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            List each life insurance company you have a policy with. Amounts
            are not stored here, only the relationships.
          </p>
        </div>
      </section>

      <section>
        <NewClientPolicyForm clientId={client.id} />
      </section>

      <section className="space-y-2">
        {client.policies.length === 0 ? (
          <p className="text-xs text-slate-400">
            You have not added any policies yet.
          </p>
        ) : (
          client.policies.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-50">
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
                      Beneficiaries:{" "}
                      {p.beneficiaries
                        .map((pb) => `${pb.beneficiary.firstName} ${pb.beneficiary.lastName}`)
                        .join(", ")}
                    </>
                  ) : (
                    <>No beneficiaries linked yet</>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

