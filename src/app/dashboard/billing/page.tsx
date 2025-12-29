import BillingClient from "./page.client";
import { BILLING_ENABLED } from "@/lib/flags";

export default function BillingPage() {
  if (!BILLING_ENABLED) {
    return (
      <div className="max-w-2xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Firm Registry Subscription</h1>
        <div className="rounded-2xl border p-5 space-y-3">
          <div className="text-sm text-slate-800">Status</div>
          <div className="text-lg font-medium text-slate-900">Registry Inactive</div>
          <p className="text-sm text-slate-700">
            Billing is being activated for early firms. Contact us to enable.
          </p>
        </div>
      </div>
    );
  }

  return <BillingClient />;
}


