import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/utils/clerk";
import { FileText, Users, CheckCircle } from "lucide-react";

export default async function ClientPortalHome() {
  // The layout already handles authentication and role checks
  // Just get the user here - if we reach this point, they're authenticated
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/client/login");
  }

  // Get client record
  const client = await prisma.client.findFirst({
    where: { userId: user.id },
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
    redirect("/client/enter-invite");
  }

  const policyCount = client.policies.length;
  const beneficiaryCount = client.beneficiaries.length;
  const totalPolicyBeneficiaries = client.policies.reduce(
    (sum, p) => sum + p.beneficiaries.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card p-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">
          Welcome, {client.firstName} {client.lastName}
        </h1>
        <p className="mt-2 text-base text-slateui-600">
          Manage your life insurance policies and beneficiary information.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3 bg-gold-500/10">
              <FileText className="h-6 w-6 text-gold-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-ink-900">{policyCount}</div>
              <div className="text-sm text-slateui-600">Policies</div>
            </div>
          </div>
          <Link
            href="/client-portal/policies"
            className="mt-4 block text-sm font-medium text-gold-500 hover:text-gold-600 transition"
          >
            View all policies →
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3 bg-ink-800/10">
              <Users className="h-6 w-6 text-ink-800" />
            </div>
            <div>
              <div className="text-2xl font-bold text-ink-900">{beneficiaryCount}</div>
              <div className="text-sm text-slateui-600">Beneficiaries</div>
            </div>
          </div>
          <Link
            href="/client-portal/beneficiaries"
            className="mt-4 block text-sm font-medium text-ink-800 hover:text-ink-900 transition"
          >
            View all beneficiaries →
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3 bg-gold-500/10">
              <CheckCircle className="h-6 w-6 text-gold-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-ink-900">{totalPolicyBeneficiaries}</div>
              <div className="text-sm text-slateui-600">Policy-Beneficiary Links</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/client-portal/policies"
            className="btn-primary inline-flex items-center justify-center px-4 py-2 text-sm"
          >
            View Policies
          </Link>
          <Link
            href="/client-portal/beneficiaries"
            className="btn-secondary inline-flex items-center justify-center px-4 py-2 text-sm"
          >
            Manage Beneficiaries
          </Link>
        </div>
      </div>

      {/* Recent Policies */}
      {client.policies.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink-900 mb-4">Your Policies</h2>
          <div className="space-y-3">
            {client.policies.slice(0, 5).map((policy) => (
              <Link
                key={policy.id}
                href={`/client-portal/policies`}
                className="block rounded-xl border border-slateui-200 bg-paper-50 p-4 hover:border-gold-400 hover:bg-gold-500/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-ink-900">
                      {policy.insurer?.name || "Unknown Insurer"}
                    </div>
                    <div className="text-sm text-slateui-600">
                      {policy.policyNumber && `Policy #${policy.policyNumber}`}
                      {policy.policyType && ` • ${policy.policyType}`}
                    </div>
                  </div>
                  <div className="text-sm text-slateui-500">
                    {policy.beneficiaries.length} beneficiary
                    {policy.beneficiaries.length !== 1 ? "ies" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {client.policies.length > 5 && (
            <Link
              href="/client-portal/policies"
              className="mt-4 block text-center text-sm font-medium text-gold-500 hover:text-gold-600 transition"
            >
              View all {client.policies.length} policies →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
