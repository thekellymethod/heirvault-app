import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { BillingActions } from "./BillingActions";

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

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

  const orgMember = user?.orgMemberships?.[0];
  if (!user || !orgMember) redirect("/dashboard");

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

