import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { EmptyListState, EmptySearchState } from "@/components/ui/empty-state";
import { SortSelect } from "@/components/ui/sort-select";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string, sort?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const searchTerm = params.search?.trim() || "";
  const sortBy = params.sort || "createdAt";

  // Build search conditions (case-insensitive)
  const searchWhere = searchTerm
    ? {
        OR: [
          { policy_number: { contains: searchTerm, mode: 'insensitive' as const } },
          { policy_type: { contains: searchTerm, mode: 'insensitive' as const } },
          { carrier_name_raw: { contains: searchTerm, mode: 'insensitive' as const } },
          { clients: {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' as const } },
                { lastName: { contains: searchTerm, mode: 'insensitive' as const } },
                { email: { contains: searchTerm, mode: 'insensitive' as const } },
              ],
            },
          },
          { insurers: { name: { contains: searchTerm, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  // Build sort order
  let orderBy: Array<Record<string, unknown>> | Record<string, unknown>;
  switch (sortBy) {
    case "clientName":
      orderBy = [{ clients: { lastName: 'desc' } }, { clients: { firstName: 'desc' } }];
      break;
    case "insurer":
      orderBy = [{ insurers: { name: 'desc' } }];
      break;
    case "policyNumber":
      orderBy = [{ policy_number: 'desc' }];
      break;
    case "verificationStatus":
      orderBy = [{ verification_status: 'desc' }];
      break;
    case "createdAt":
    default:
      orderBy = [{ createdAt: 'desc' }];
      break;
  }

  // Fetch policies joined with authorized clients (left join insurers to include unresolved)
  const accessRecords = await prisma.attorneyClientAccess.findMany({
    where: {
      attorneyId: user.id,
      isActive: true,
    },
    include: {
      clients: {
        include: {
          policies: {
            where: searchWhere,
            include: {
              insurers: true,
            },
            orderBy: (Array.isArray(orderBy) && orderBy.length === 1 ? orderBy[0] : orderBy) as Record<string, unknown> | undefined,
          },
        },
      },
    },
  });

  const rows = accessRecords.flatMap(access =>
    access.clients.policies.map(policy => ({
      policy: {
        id: policy.id,
        policyNumber: policy.policy_number,
        policyType: policy.policy_type,
        carrierNameRaw: policy.carrier_name_raw,
        verificationStatus: (policy as { verification_status?: string }).verification_status || 'PENDING',
        createdAt: policy.createdAt,
        updatedAt: policy.updated_at,
      },
      client: {
        id: access.clients.id,
        firstName: access.clients.firstName,
        lastName: access.clients.lastName,
        email: access.clients.email,
      },
      insurer: policy.insurers ? {
        id: policy.insurers.id,
        name: policy.insurers.name,
      } : null,
    }))
  );

  const policiesList = rows.map((r: typeof rows[number]) => {
    const displayName = r.insurer?.name ?? r.policy.carrierNameRaw ?? "Unknown";
    const isUnresolved = !r.insurer?.name && !!r.policy.carrierNameRaw;
    
    return {
      id: r.policy.id,
      policyNumber: r.policy.policyNumber,
      policyType: r.policy.policyType,
      carrierNameRaw: r.policy.carrierNameRaw,
      verificationStatus: r.policy.verificationStatus,
      createdAt: r.policy.createdAt,
      updatedAt: r.policy.updatedAt,
      client: {
        id: r.client.id,
        firstName: r.client.firstName,
        lastName: r.client.lastName,
        email: r.client.email,
      },
      insurer: r.insurer ? {
        id: r.insurer.id,
        name: r.insurer.name,
      } : null,
      displayName,
      isUnresolved,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Policies</h1>
          <p className="text-sm text-slateui-600">
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
            className="flex-1 rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 placeholder:text-slateui-400 focus:border-slateui-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 hover:bg-slateui-50 transition-colors"
          >
            Search
          </button>
          {searchTerm && (
            <Link
              href="/dashboard/policies"
              className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 hover:bg-slateui-50 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
        <SortSelect
          name="sort"
          defaultValue={sortBy}
          options={[
            { value: "createdAt", label: "Newest First" },
            { value: "clientName", label: "Client Name" },
            { value: "insurer", label: "Insurer" },
            { value: "policyNumber", label: "Policy Number" },
            { value: "verificationStatus", label: "Verification Status" },
          ]}
          className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 focus:border-slateui-500 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-slateui-200 bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900">
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
              clearHref="/dashboard/policies"
            />
          ) : (
            <EmptyListState
              icon="FileText"
              title="No policies found"
              description="Policies will appear here once you create clients and add policies to their registries."
              action={{
                label: "Create Client",
                href: "/dashboard/clients/new",
              }}
            />
          )
        ) : (
          <div className="divide-y divide-slateui-200">
            {policiesList.map((p: typeof policiesList[number]) => (
              <div
                key={p.id}
                className="px-4 py-4 hover:bg-slateui-50 transition-colors"
              >
                <div className="grid grid-cols-12 items-center gap-2 min-w-[1000px]">
                  <div className="col-span-3">
                    <Link
                      href={`/dashboard/policies/${p.id}`}
                      className="text-sm font-medium text-ink-900 hover:text-blue-600"
                    >
                      {p.policyNumber || "—"}
                    </Link>
                    <div className="text-xs text-slateui-600 hidden sm:block">ID: {p.id.slice(0, 8)}...</div>
                  </div>
                  <div className="col-span-2 hidden lg:block">
                    <Link
                      href={`/dashboard/clients/${p.client.id}`}
                      className="text-sm text-ink-900 hover:text-blue-600"
                    >
                      {p.client.firstName} {p.client.lastName}
                    </Link>
                    <div className="text-xs text-slateui-600">{p.client.email}</div>
                  </div>
                  <div className="col-span-2 text-sm text-ink-900">
                    <div className="flex items-center gap-2">
                      <span>{p.displayName}</span>
                      {p.isUnresolved && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                          Unresolved
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-ink-900">
                    {p.policyType || "—"}
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        p.verificationStatus === "VERIFIED"
                          ? "bg-green-100 text-green-700"
                          : p.verificationStatus === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : p.verificationStatus === "DISCREPANCY"
                          ? "bg-orange-100 text-orange-700"
                          : p.verificationStatus === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-slateui-100 text-slateui-700"
                      }`}
                    >
                      {p.verificationStatus}
                    </span>
                  </div>
                  <div className="col-span-1 text-right text-xs text-slateui-600">
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
}

