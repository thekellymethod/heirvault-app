import { redirect } from "next/navigation";

/**
 * Stripe checkout success/cancel URLs point here; billing UI lives at /dashboard/billing.
 */
export default async function DashboardSettingsBillingRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const u = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      for (const v of val) u.append(key, v);
    } else {
      u.set(key, val);
    }
  }
  const qs = u.toString();
  redirect(qs ? `/dashboard/billing?${qs}` : "/dashboard/billing");
}
