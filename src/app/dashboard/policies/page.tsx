import Link from "next/link";
import { db, attorneyClientAccess, clients, policies, insurers, eq, desc, and, or, ilike } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { EmptyListState, EmptySearchState } from "@/components/ui/empty-state";
import { FileText, Search } from "lucide-react";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; sort?: string }>;
}) {
  try {
    const user = await requireAuth();
    const params = await searchParams;
    const searchTerm = params.search?.trim() || "";
    const sortBy = params.sort || "createdAt";

    // Build search conditions (case-insensitive)
    const searchConditions = searchTerm
      ? [
          ilike(policies.policyNumber, `%${searchTerm}%`),
          ilike(policies.policyType, `%${searchTerm}%`),
          ilike(insurers.name, `%${searchTerm}%`),
          ilike(clients.firstName, `%${searchTerm}%`),
          ilike(clients.lastName, `%${searchTerm}%`),
          ilike(clients.email, `%${searchTerm}%`),
        ]
      : [];

    // Build sort order
    let orderBy;
    switch (sortBy) {
      case "clientName":
        orderBy = [desc(clients.lastName), desc(clients.firstName)];
        break;
      case "insurer":
        orderBy = [desc(insurers.name)];
        break;
      case "policyNumber":
        orderBy = [desc(policies.policyNumber)];
        break;
      case "verificationStatus":
        orderBy = [desc(policies.verificationStatus)];
        break;
      case "createdAt":
      default:
        orderBy = [desc(policies.createdAt)];
        break;
    }

    // Fetch policies joined with authorized clients
    const rows = await db
      .select({
        policy: {
          id: policies.id,
          policyNumber: policies.policyNumber,
          policyType: policies.policyType,
          verificationStatus: policies.verificationStatus,
          createdAt: policies.createdAt,
          updatedAt: policies.updatedAt,
        },
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
        insurer: {
          id: insurers.id,
          name: insurers.name,
        },
      })
      .from(attorneyClientAccess)
      .innerJoin(clients, eq(attorneyClientAccess.clientId, clients.id))
      .innerJoin(policies, eq(policies.clientId, clients.id))
      .innerJoin(insurers, eq(policies.insurerId, insurers.id))
      .where(
        and(
          eq(attorneyClientAccess.attorneyId, user.id),
          eq(attorneyClientAccess.isActive, true),
          searchConditions.length > 0 ? or(...searchConditions) : undefined
        )
      )
      .orderBy(...orderBy);

    const policiesList = rows.map((r: typeof rows[number]) => ({
      id: r.policy.id,
      policyNumber: r.policy.policyNumber,
      policyType: r.policy.policyType,
      verificationStatus: r.policy.verificationStatus,
      createdAt: r.policy.createdAt,
      updatedAt: r.policy.updatedAt,
      client: {
        id: r.client.id,
        firstName: r.client.firstName,
        lastName: r.client.lastName,
        email: r.client.email,
      },
      insurer: {
        id: r.insurer.id,
        name: r.insurer.name,
      },
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Policies</h1>
            <p className="text-sm text-slate-300">
              View all policies across your authorized clients.
            </p>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex gap-4 items-center">
          <form method="get" className="flex-1 flex gap-2">
            <input
              type="text"
              name="search"
              placeholder="Search by policy number, type, insurer, or client name..."
              defaultValue={searchTerm}
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-700 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 transition-colors"
            >
              Search
            </button>
            {searchTerm && (
              <Link
                href="/dashboard/policies"
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
          <form method="get" className="flex gap-2">
            <input type="hidden" name="search" value={searchTerm} />
            <select
              name="sort"
              title="Sort by"
              defaultValue={sortBy}
              onChange={(e) => {
                const form = e.currentTarget.form;
                if (form) form.submit();
              }}
              className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm text-slate-100 focus:border-slate-700 focus:outline-none"
            >
              <option value="createdAt">Newest First</option>
              <option value="clientName">Client Name</option>
              <option value="insurer">Insurer</option>
              <option value="policyNumber">Policy Number</option>
              <option value="verificationStatus">Verification Status</option>
            </select>
          </form>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40">
          <div className="grid grid-cols-12 gap-2 border-b border-slate-800 px-4 py-3 text-xs font-semibold text-slate-400">
            <div className="col-span-3">Policy</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2">Insurer</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Created</div>
          </div>

          {policiesList.length === 0 ? (
            searchTerm ? (
              <EmptySearchState
                searchQuery={searchTerm}
                onClear={() => {
                  window.location.href = "/dashboard/policies";
                }}
              />
            ) : (
              <EmptyListState
                icon={FileText}
                title="No policies found"
                description="Policies will appear here once you create clients and add policies to their registries."
                action={{
                  label: "Create Client",
                  onClick: () => {
                    window.location.href = "/dashboard/clients/new";
                  },
                }}
              />
            )
          ) : (
            <div className="divide-y divide-slate-800">
              {policiesList.map((p: typeof policiesList[number]) => (
                <div
                  key={p.id}
                  className="px-4 py-4 hover:bg-slate-900/40 transition-colors"
                >
                  <div className="grid grid-cols-12 items-center gap-2 min-w-[1000px]">
                    <div className="col-span-3">
                      <Link
                        href={`/dashboard/policies/${p.id}`}
                        className="text-sm font-medium text-slate-100 hover:text-blue-400"
                      >
                        {p.policyNumber || "—"}
                      </Link>
                      <div className="text-xs text-slate-400 hidden sm:block">ID: {p.id.slice(0, 8)}...</div>
                    </div>
                    <div className="col-span-2 hidden lg:block">
                      <Link
                        href={`/dashboard/clients/${p.client.id}`}
                        className="text-sm text-slate-200 hover:text-blue-400"
                      >
                        {p.client.firstName} {p.client.lastName}
                      </Link>
                      <div className="text-xs text-slate-400">{p.client.email}</div>
                    </div>
                    <div className="col-span-2 text-sm text-slate-200">
                      {p.insurer.name}
                    </div>
                    <div className="col-span-2 text-sm text-slate-200">
                      {p.policyType || "—"}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          p.verificationStatus === "VERIFIED"
                            ? "bg-green-500/20 text-green-400"
                            : p.verificationStatus === "PENDING"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : p.verificationStatus === "DISCREPANCY"
                            ? "bg-orange-500/20 text-orange-400"
                            : p.verificationStatus === "REJECTED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {p.verificationStatus}
                      </span>
                    </div>
                    <div className="col-span-1 text-right text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("PoliciesPage error:", error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Error</h1>
          <p className="text-sm text-slate-300">
            Failed to load policies. Please try refreshing the page.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }
}

