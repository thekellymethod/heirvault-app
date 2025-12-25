import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getCurrentUserWithOrg } from "@/lib/authz";

interface InviteRow {
  id: string;
  client_id: string;
  email: string;
  token: string;
  created_at: Date;
  used_at: Date | null;
  first_name: string;
  last_name: string;
}

interface RecentInvite {
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
}

export default async function AnalyticsPage() {
  // Clerk middleware handles authentication - no need for manual redirects
  await auth();

  const { user, orgMember } = await getCurrentUserWithOrg();
  if (!user) redirect("/dashboard");

  // Get organization ID - handle both possible field names (optional)
  const orgId = orgMember ? ((orgMember as { organizationId?: string }).organizationId || orgMember.organizations?.id) : null;

  // Use raw SQL for queries to avoid Prisma client issues
  let clientCount = 0;
  let policyCount = 0;
  let activePolicyCount = 0;
  let beneficiaryCount = 0;
  let recentInvites: RecentInvite[] = [];

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
        ? prisma.$queryRaw<Array<InviteRow>>`
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
        : prisma.$queryRaw<Array<InviteRow>>`
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
    
    recentInvites = invitesResult.map((inv: InviteRow) => ({
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
  } catch (sqlError: unknown) {
    const errorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
    console.error("Analytics page: Raw SQL failed, trying Prisma:", errorMessage);
    // Fallback to Prisma
    try {
      const [
        clientCountResult,
        policyCountResult,
        activePolicyCountResult,
        beneficiaryCountResult,
        recentInvitesResult,
      ] = await Promise.all([
        orgId ? prisma.clients.count({ where: { org_id: orgId } }) : prisma.attorney_client_access.count({ where: { attorney_id: user.id, is_active: true } }),
        orgId ? prisma.policies.count({
          where: { clients: { org_id: orgId } },
        }) : prisma.policies.count({
          where: { clients: { attorney_client_access: { some: { attorney_id: user.id, is_active: true } } } },
        }),
        orgId ? prisma.policies.count({
          where: { clients: { org_id: orgId }, verification_status: "VERIFIED" },
        }) : prisma.policies.count({
          where: { clients: { attorney_client_access: { some: { attorney_id: user.id, is_active: true } } }, verification_status: "VERIFIED" },
        }),
        orgId ? prisma.beneficiaries.count({
          where: { clients: { org_id: orgId } },
        }) : prisma.beneficiaries.count({
          where: { clients: { attorney_client_access: { some: { attorney_id: user.id, is_active: true } } } },
        }),
        orgId ? prisma.client_invites.findMany({
          where: { clients: { org_id: orgId } },
          include: { clients: true },
          orderBy: { created_at: "desc" },
          take: 10,
        }) : prisma.client_invites.findMany({
          where: { clients: { attorney_client_access: { some: { attorney_id: user.id, is_active: true } } } },
          include: { clients: true },
          orderBy: { created_at: "desc" },
          take: 10,
        }),
      ]);
      
      clientCount = clientCountResult;
      policyCount = policyCountResult;
      activePolicyCount = activePolicyCountResult;
      beneficiaryCount = beneficiaryCountResult;
      recentInvites = recentInvitesResult.map((inv) => ({
        id: inv.id,
        clientId: inv.client_id,
        email: inv.email,
        token: inv.token,
        createdAt: inv.created_at,
        usedAt: inv.used_at,
        client: {
          id: inv.clients.id,
          firstName: inv.clients.first_name,
          lastName: inv.clients.last_name,
        },
      }));
    } catch (prismaError: unknown) {
      const errorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
      console.error("Analytics page: Prisma also failed:", errorMessage);
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
            <span className="text-gold-500">{activePolicyCount}</span>
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
                      <span className="ml-1 text-gold-500">
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

