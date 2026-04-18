import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrgRow = {
  id: string;
  name: string;
  billing_plan: string | null;
  billing_status: string | null;
};

function messageFromDbError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: string }).message);
  }
  return String(error);
}

function looksLikeConnectivityIssue(msg: string): boolean {
  return /ENOTFOUND|fetch failed|getaddrinfo|ECONNREFUSED|certificate|TLS/i.test(msg);
}

export default async function DashboardPage() {
  const { getToken, userId } = await auth();
  if (!userId) {
    redirect("/attorney/sign-in");
  }

  const adminStatus = await isAdmin();
  const token = await getToken({ template: "supabase" }).catch(() => null);

  let organizations: OrgRow[] = [];
  let loadError: string | null = null;

  try {
    if (adminStatus) {
      const db = getDb();
      const { data, error } = await db
        .from("organizations")
        .select("id,name,billing_plan,billing_status")
        .order("name", { ascending: true })
        .limit(40);
      if (error) loadError = messageFromDbError(error);
      else organizations = (data ?? []) as OrgRow[];
    } else {
      const supabase = createServerClient({ token });
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,billing_plan,billing_status")
        .order("name", { ascending: true })
        .limit(20);
      if (error) loadError = messageFromDbError(error);
      else organizations = (data ?? []) as OrgRow[];
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Connection failed";
  }

  const connectivity = loadError ? looksLikeConnectivityIssue(loadError) : false;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 md:text-3xl">Dashboard</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slateui-600">
          Work with clients, policies, and firm settings from the sidebar. Complete your profile and firm billing when
          you&apos;re ready—navigation stays available even if some data can&apos;t load yet.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/settings/profile"
          className="rounded-xl border border-slateui-200 bg-white px-4 py-3 text-sm font-medium text-ink-900 shadow-sm transition hover:border-gold-500/40 hover:bg-paper-50"
        >
          Profile &amp; account
        </Link>
        <Link
          href="/dashboard/settings/org"
          className="rounded-xl border border-slateui-200 bg-white px-4 py-3 text-sm font-medium text-ink-900 shadow-sm transition hover:border-gold-500/40 hover:bg-paper-50"
        >
          Firm / organization
        </Link>
        <Link
          href="/dashboard/billing"
          className="rounded-xl border border-slateui-200 bg-white px-4 py-3 text-sm font-medium text-ink-900 shadow-sm transition hover:border-gold-500/40 hover:bg-paper-50"
        >
          Billing &amp; registry activation
        </Link>
        <Link
          href="/dashboard/clients"
          className="rounded-xl border border-slateui-200 bg-white px-4 py-3 text-sm font-medium text-ink-900 shadow-sm transition hover:border-gold-500/40 hover:bg-paper-50"
        >
          Clients
        </Link>
      </section>

      {loadError && (
        <div
          className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-5 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold text-amber-950">We couldn&apos;t load organization data</p>
          <p className="mt-2 font-mono text-xs leading-relaxed text-amber-900/90">{loadError}</p>
          {connectivity && (
            <p className="mt-3 text-xs leading-relaxed text-amber-900/85">
              This usually means the app cannot reach your database host (wrong or outdated Supabase URL, offline
              project, or DNS). Verify{" "}
              <code className="rounded bg-amber-100/90 px-1 py-0.5">DATABASE_URL</code> and{" "}
              <code className="rounded bg-amber-100/90 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> in your environment,
              then restart the server or redeploy.
            </p>
          )}
          <p className="mt-4 text-xs text-amber-900/80">
            You can still open{" "}
            <Link href="/dashboard/settings/profile" className="font-medium underline underline-offset-2">
              profile
            </Link>
            ,{" "}
            <Link href="/dashboard/billing" className="font-medium underline underline-offset-2">
              billing
            </Link>
            , and other pages while this is fixed.
          </p>
        </div>
      )}

      {!loadError && organizations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slateui-600">
            {adminStatus ? "Organizations" : "Your organizations"}
          </h2>
          <ul className="divide-y divide-slateui-200 overflow-hidden rounded-xl border border-slateui-200 bg-white shadow-sm">
            {organizations.map((org) => (
              <li key={org.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-ink-900">{org.name}</span>
                <span className="text-xs text-slateui-600">
                  {org.billing_plan ?? "—"}
                  {org.billing_status ? ` · ${org.billing_status}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loadError && organizations.length === 0 && (
        <div className="rounded-xl border border-slateui-200 bg-white p-6 text-sm text-slateui-700 shadow-sm">
          <p className="font-medium text-ink-900">No organizations yet</p>
          <p className="mt-2 leading-relaxed">
            {adminStatus
              ? "No rows returned from organizations (or none exist yet)."
              : "If you just joined, your firm may still need to be linked. Complete profile and billing, or ask an admin to add you to an organization."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/settings/org"
              className="text-sm font-medium text-gold-700 underline-offset-2 hover:underline"
            >
              Firm settings
            </Link>
            <Link href="/dashboard/billing" className="text-sm font-medium text-gold-700 underline-offset-2 hover:underline">
              Billing
            </Link>
          </div>
        </div>
      )}

      <p className="text-xs text-slateui-500">
        Policyholders can submit policy documents without signing in via the public{" "}
        <Link href="/submit-policy" className="font-medium text-gold-700 underline-offset-2 hover:underline">
          policy submission
        </Link>{" "}
        page (receipt generated on submit). Search and firm workflows require an attorney or firm account.
      </p>
    </div>
  );
}
