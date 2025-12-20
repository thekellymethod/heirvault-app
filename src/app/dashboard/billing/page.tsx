import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { BillingActions } from "./BillingActions";

export default async function BillingPage() {
  // Clerk middleware handles authentication - no need for manual redirects
  const { userId } = await auth();

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      orgMemberships: {
        include: {
          organizations: true,
        },
      },
    },
  });

  if (!user) redirect("/dashboard");

  const orgMember = user?.orgMemberships?.[0];
  
  // If no organization, show message to create one
  if (!orgMember) {
    return (
      <main className="p-8 max-w-3xl mx-auto space-y-6">
        <section>
          <h1 className="text-xl font-semibold text-slate-50">
            Billing & subscription
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Billing is available when you create or join an organization.
          </p>
        </section>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center">
          <p className="text-slate-300 mb-4">
            You need to create or join an organization to manage billing.
          </p>
          <a
            href="/dashboard/settings/org"
            className="btn-primary inline-block"
          >
            Create Organization
          </a>
        </div>
      </main>
    );
  }

  const org = orgMember.organizations;

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-50">
          Billing & subscription
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your firm&apos;s subscription to HeirVault.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Current plan</div>
            <div className="text-lg font-semibold">
              {org.billingPlan === "FREE" && "Free (evaluation)"}
              {org.billingPlan === "SOLO" && "Solo"}
              {org.billingPlan === "SMALL_FIRM" && "Small Firm"}
              {org.billingPlan === "ENTERPRISE" && "Enterprise"}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Status:{" "}
            <span className="text-emerald-300">
              {org.billingStatus || "n/a"}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Billing is handled securely by Stripe. We do not store card details.
        </p>
      </section>

      <BillingActions currentPlan={org.billingPlan} />
    </main>
  );
}

