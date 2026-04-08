// src/app/dashboard/analytics/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUserWithOrg } from "@/lib/authz";

export const runtime = "nodejs";

type CountRow = { count: string | number | bigint };

type InviteSqlRow = {
  id: string;
  clientId: string;
  email: string;
  token: string;
  createdAt: Date | string;
  usedAt: Date | string | null;
  firstName: string | null;
  lastName: string | null;
};

type RecentInvite = {
  id: string;
  clientId: string;
  email: string;
  token: string;
  createdAt: Date;
  usedAt: Date | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

const toNumber = (v: CountRow["count"] | undefined): number => {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toDate = (v: Date | string): Date => (v instanceof Date ? v : new Date(v));

export default async function AnalyticsPage() {
  // Ensure Clerk auth context is present (middleware may already enforce auth)
  await auth();

  const { user, orgMember } = await getCurrentUserWithOrg();
  if (!user) redirect("/dashboard");

  const orgId = orgMember?.organization_id ?? null;

  let clientCount = 0;
  let policyCount = 0;
  let activePolicyCount = 0;
  let beneficiaryCount = 0;
  let recentInvites: RecentInvite[] = [];

  try {
    const { queryRaw } = await import("@/lib/db");

    const [
      clientResult,
      policyResult,
      activePolicyResult,
      beneficiaryResult,
      invitesResult,
    ] = await Promise.all([
      // Clients
      orgId
        ? queryRaw<CountRow>(
            `
            SELECT COUNT(*)::bigint as count
            FROM clients
            WHERE org_id = $1
            `,
            [orgId]
          )
        : queryRaw<CountRow>(
            `
            SELECT COUNT(DISTINCT aca.client_id)::bigint as count
            FROM attorney_client_access aca
            WHERE aca.attorney_id = $1 AND aca.is_active = true
            `,
            [user.id]
          ),

      // Policies
      orgId
        ? queryRaw<CountRow>(
            `
            SELECT COUNT(*)::bigint as count
            FROM policies p
            INNER JOIN clients c ON c.id = p."clientId"
            WHERE c.org_id = $1
            `,
            [orgId]
          )
        : queryRaw<CountRow>(
            `
            SELECT COUNT(*)::bigint as count
            FROM policies p
            INNER JOIN attorney_client_access aca ON aca.client_id = p."clientId"
            WHERE aca.attorney_id = $1 AND aca.is_active = true
            `,
            [user.id]
          ),

      // Active policies (NOTE: adjust column name if your schema differs)
      orgId
        ? queryRaw<CountRow>(
            `
            SELECT COUNT(*)::bigint as count
            FROM policies p
            INNER JOIN clients c ON c.id = p."clientId"
            WHERE c.org_id = $1 AND p.status = 'ACTIVE'
            `,
            [orgId]
          )
        : queryRaw<CountRow>(
            `
            SELECT COUNT(*)::bigint as count
            FROM policies p
            INNER JOIN attorney_client_access aca ON aca.client_id = p."clientId"
            WHERE aca.attorney_id = $1 AND aca.is_active = true AND p.status = 'ACTIVE'
            `,
            [user.id]
          ),

      // Beneficiaries
      orgId
        ? queryRaw<CountRow>(
            `
            SELECT COUNT(*)::bigint as count
            FROM beneficiaries b
            INNER JOIN clients c ON c.id = b."clientId"
            WHERE c.org_id = $1
            `,
            [orgId]
          )
        : queryRaw<CountRow>(
            `
            SELECT COUNT(*)::bigint as count
            FROM beneficiaries b
            INNER JOIN attorney_client_access aca ON aca.client_id = b."clientId"
            WHERE aca.attorney_id = $1 AND aca.is_active = true
            `,
            [user.id]
          ),

      // Recent invites
      orgId
        ? queryRaw<InviteSqlRow>(
            `
            SELECT
              ci.id                         as "id",
              ci.client_id                  as "clientId",
              ci.email                      as "email",
              ci.token                      as "token",
              ci."createdAt"                as "createdAt",
              ci.used_at                    as "usedAt",
              c."firstName"                 as "firstName",
              c."lastName"                  as "lastName"
            FROM client_invites ci
            INNER JOIN clients c ON c.id = ci.client_id
            WHERE c.org_id = $1
            ORDER BY ci."createdAt" DESC
            LIMIT 10
            `,
            [orgId]
          )
        : queryRaw<InviteSqlRow>(
            `
            SELECT
              ci.id                         as "id",
              ci.client_id                  as "clientId",
              ci.email                      as "email",
              ci.token                      as "token",
              ci."createdAt"                as "createdAt",
              ci.used_at                    as "usedAt",
              c."firstName"                 as "firstName",
              c."lastName"                  as "lastName"
            FROM client_invites ci
            INNER JOIN clients c ON c.id = ci.client_id
            INNER JOIN attorney_client_access aca ON aca.client_id = c.id
            WHERE aca.attorney_id = $1 AND aca.is_active = true
            ORDER BY ci."createdAt" DESC
            LIMIT 10
            `,
            [user.id]
          ),
    ]);

    clientCount = toNumber(clientResult[0]?.count);
    policyCount = toNumber(policyResult[0]?.count);
    activePolicyCount = toNumber(activePolicyResult[0]?.count);
    beneficiaryCount = toNumber(beneficiaryResult[0]?.count);

    recentInvites = invitesResult.map((inv: InviteSqlRow): RecentInvite => ({
      id: inv.id,
      clientId: inv.clientId,
      email: inv.email,
      token: inv.token,
      createdAt: toDate(inv.createdAt),
      usedAt: inv.usedAt ? toDate(inv.usedAt) : null,
      client: {
        id: inv.clientId,
        firstName: inv.firstName ?? "",
        lastName: inv.lastName ?? "",
      },
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analytics page: SQL failed:", message);
    // Leave defaults (0, empty list)
  }

  const completion =
    clientCount === 0 ? null : Math.round((activePolicyCount / Math.max(clientCount, 1)) * 100);

  return (
    <main className="p-8 mx-auto max-w-5xl space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Firm analytics</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Overview of registries managed under your firm.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Clients</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {clientCount}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Policies</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {policyCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
            Active: <span className="text-gold-500">{activePolicyCount}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Beneficiaries</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {beneficiaryCount}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">Completion</div>
          <div className="mt-1 text-xl font-semibold text-gold-500">
            {completion === null ? "—" : `${completion}%`}
          </div>
          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
            Approx. active policies per client
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Recent client invitations
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-xs">
          {recentInvites.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No invitations sent yet.</p>
          ) : (
            <ul className="space-y-1">
              {recentInvites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="text-slate-900 dark:text-slate-100">
                      {inv.client.firstName} {inv.client.lastName}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      {inv.email} · {inv.token.slice(0, 8)}…
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    {inv.createdAt.toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {inv.usedAt && <span className="ml-1 text-gold-500">· accepted</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
