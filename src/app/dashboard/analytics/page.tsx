import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentUserWithOrg } from "@/lib/authz";

export default async function AnalyticsPage() {
  // Clerk middleware handles authentication - no need for manual redirects
  const { userId } = await auth();

  const { user, orgMember } = await getCurrentUserWithOrg();
  if (!user) redirect("/dashboard");

  // Get organization ID - handle both possible field names (optional)
  const orgId = orgMember ? ((orgMember as any).organizationId || orgMember.organizations?.id) : null;

  // Use raw SQL for queries to avoid Prisma client issues
  let clientCount = 0;
  let policyCount = 0;
  let activePolicyCount = 0;
  let beneficiaryCount = 0;
  let recentInvites: any[] = [];

  try {
    // Get counts using raw SQL - if no org, show user's own data via AttorneyClientAccess
    const [clientResult, policyResult, activePolicyResult, beneficiaryResult, invitesResult] = await Promise.all([
      orgId 
        ? prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM clients WHERE org_id = ${orgId}
          `
        : prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(DISTINCT aca.client_id) as count 
            FROM attorney_client_access aca
            WHERE aca.attorney_id = ${user.id} AND aca.is_active = true
          `,
      orgId
        ? prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count 
            FROM policies p
            INNER JOIN clients c ON c.id = p.client_id
            WHERE c.org_id = ${orgId}
          `
        : prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count 
            FROM policies p
            INNER JOIN attorney_client_access aca ON aca.client_id = p.client_id
            WHERE aca.attorney_id = ${user.id} AND aca.is_active = true
          `,
      orgId
        ? prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count 
            FROM policies p
            INNER JOIN clients c ON c.id = p.client_id
            WHERE c.org_id = ${orgId} AND p.status = 'ACTIVE'
          `
        : prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count 
            FROM policies p
            INNER JOIN attorney_client_access aca ON aca.client_id = p.client_id
            WHERE aca.attorney_id = ${user.id} AND aca.is_active = true AND p.status = 'ACTIVE'
          `,
      orgId
        ? prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count 
            FROM beneficiaries b
            INNER JOIN clients c ON c.id = b.client_id
            WHERE c.org_id = ${orgId}
          `
        : prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count 
            FROM beneficiaries b
            INNER JOIN attorney_client_access aca ON aca.client_id = b.client_id
            WHERE aca.attorney_id = ${user.id} AND aca.is_active = true
          `,
      orgId
        ? prisma.$queryRaw<Array<{
            id: string;
            client_id: string;
            email: string;
            token: string;
            created_at: Date;
            used_at: Date | null;
            first_name: string;
            last_name: string;
          }>>`
            SELECT 
              ci.id,
              ci.client_id,
              ci.email,
              ci.token,
              ci.created_at,
              ci.used_at,
              c.first_name,
              c.last_name
            FROM client_invites ci
            INNER JOIN clients c ON c.id = ci.client_id
            WHERE c.org_id = ${orgId}
            ORDER BY ci.created_at DESC
            LIMIT 10
          `
        : prisma.$queryRaw<Array<{
            id: string;
            client_id: string;
            email: string;
            token: string;
            created_at: Date;
            used_at: Date | null;
            first_name: string;
            last_name: string;
          }>>`
            SELECT 
              ci.id,
              ci.client_id,
              ci.email,
              ci.token,
              ci.created_at,
              ci.used_at,
              c.first_name,
              c.last_name
            FROM client_invites ci
            INNER JOIN clients c ON c.id = ci.client_id
            INNER JOIN attorney_client_access aca ON aca.client_id = c.id
            WHERE aca.attorney_id = ${user.id} AND aca.is_active = true
            ORDER BY ci.created_at DESC
            LIMIT 10
          `,
    ]);

    clientCount = Number(clientResult[0]?.count || 0);
    policyCount = Number(policyResult[0]?.count || 0);
    activePolicyCount = Number(activePolicyResult[0]?.count || 0);
    beneficiaryCount = Number(beneficiaryResult[0]?.count || 0);
    
    recentInvites = invitesResult.map(inv => ({
      id: inv.id,
      clientId: inv.client_id,
      email: inv.email,
      token: inv.token,
      createdAt: inv.created_at,
      usedAt: inv.used_at,
      client: {
        id: inv.client_id,
        firstName: inv.first_name,
        lastName: inv.last_name,
      },
    }));
  } catch (sqlError: any) {
    console.error("Analytics page: Raw SQL failed, trying Prisma:", sqlError.message);
    // Fallback to Prisma
    try {
      const [
        clientCountResult,
        policyCountResult,
        activePolicyCountResult,
        beneficiaryCountResult,
        recentInvitesResult,
      ] = await Promise.all([
        prisma.client.count({ where: { orgId } }),
        prisma.policy.count({
          where: { client: { orgId } },
        }),
        prisma.policy.count({
          where: { client: { orgId }, status: "ACTIVE" },
        }),
        prisma.beneficiary.count({
          where: { client: { orgId } },
        }),
        prisma.clientInvite.findMany({
          where: { client: { orgId } },
          include: { client: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);
      
      clientCount = clientCountResult;
      policyCount = policyCountResult;
      activePolicyCount = activePolicyCountResult;
      beneficiaryCount = beneficiaryCountResult;
      recentInvites = recentInvitesResult;
    } catch (prismaError: any) {
      console.error("Analytics page: Prisma also failed:", prismaError.message);
      // Use defaults (0 counts, empty array)
    }
  }

  return (
    <main className="p-8 mx-auto max-w-5xl space-y-6">
      <section>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Firm analytics
        </h1>
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
            Active:{" "}
            <span style={{ color: "#d4af37" }}>{activePolicyCount}</span>
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
          <div className="mt-1 text-xl font-semibold" style={{ color: "#d4af37" }}>
            {clientCount === 0
              ? "—"
              : `${Math.round(
                  (activePolicyCount / Math.max(clientCount, 1)) * 100,
                )}%`}
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
                    {inv.usedAt && (
                      <span className="ml-1" style={{ color: "#d4af37" }}>
                        · accepted
                      </span>
                    )}
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

