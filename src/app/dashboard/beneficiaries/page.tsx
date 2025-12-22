import Link from "next/link";
import { db, attorneyClientAccess, clients, beneficiaries, eq, desc, and, or, ilike } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { SortSelect } from "@/components/ui/sort-select";

export default async function BeneficiariesPage({
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
          ilike(beneficiaries.firstName, `%${searchTerm}%`),
          ilike(beneficiaries.lastName, `%${searchTerm}%`),
          ilike(beneficiaries.email, `%${searchTerm}%`),
          ilike(beneficiaries.relationship, `%${searchTerm}%`),
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
      case "beneficiaryName":
        orderBy = [desc(beneficiaries.lastName), desc(beneficiaries.firstName)];
        break;
      case "relationship":
        orderBy = [desc(beneficiaries.relationship)];
        break;
      case "createdAt":
      default:
        orderBy = [desc(beneficiaries.createdAt)];
        break;
    }

    // Fetch beneficiaries joined with authorized clients
    const rows = await db
      .select({
        beneficiary: {
          id: beneficiaries.id,
          firstName: beneficiaries.firstName,
          lastName: beneficiaries.lastName,
          relationship: beneficiaries.relationship,
          email: beneficiaries.email,
          phone: beneficiaries.phone,
          dateOfBirth: beneficiaries.dateOfBirth,
          createdAt: beneficiaries.createdAt,
          updatedAt: beneficiaries.updatedAt,
        },
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
      })
      .from(attorneyClientAccess)
      .innerJoin(clients, eq(attorneyClientAccess.clientId, clients.id))
      .innerJoin(beneficiaries, eq(beneficiaries.clientId, clients.id))
      .where(
        and(
          eq(attorneyClientAccess.attorneyId, user.id),
          eq(attorneyClientAccess.isActive, true),
          searchConditions.length > 0 ? or(...searchConditions) : undefined
        )
      )
      .orderBy(...orderBy);

    const beneficiariesList = rows.map((r: typeof rows[number]) => ({
      id: r.beneficiary.id,
      firstName: r.beneficiary.firstName,
      lastName: r.beneficiary.lastName,
      relationship: r.beneficiary.relationship,
      email: r.beneficiary.email,
      phone: r.beneficiary.phone,
      dateOfBirth: r.beneficiary.dateOfBirth,
      createdAt: r.beneficiary.createdAt,
      updatedAt: r.beneficiary.updatedAt,
      client: {
        id: r.client.id,
        firstName: r.client.firstName,
        lastName: r.client.lastName,
        email: r.client.email,
      },
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">Beneficiaries</h1>
            <p className="text-sm text-slateui-600">
              View all beneficiaries across your authorized clients.
            </p>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex gap-4 items-center">
          <form method="get" className="flex-1 flex gap-2">
            <input
              type="text"
              name="search"
              placeholder="Search by name, email, relationship, or client name..."
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
              <a
                href="/dashboard/beneficiaries"
                className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 hover:bg-slateui-50 transition-colors"
              >
                Clear
              </a>
            )}
          </form>
          <SortSelect
            name="sort"
            defaultValue={sortBy}
            options={[
              { value: "createdAt", label: "Newest First" },
              { value: "clientName", label: "Client Name" },
              { value: "beneficiaryName", label: "Beneficiary Name" },
              { value: "relationship", label: "Relationship" },
            ]}
            className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 focus:border-slateui-500 focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-slateui-200 bg-white">
          <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900">
            <div className="col-span-3">Beneficiary</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2">Relationship</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-1 text-right">Created</div>
          </div>

          {beneficiariesList.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slateui-600">
              {searchTerm
                ? `No beneficiaries found matching "${searchTerm}".`
                : "No beneficiaries found. Beneficiaries will appear here once clients are added."}
            </div>
          ) : (
            <div className="divide-y divide-slateui-200">
              {beneficiariesList.map((b: typeof beneficiariesList[number]) => (
                <div
                  key={b.id}
                  className="px-4 py-4 hover:bg-slateui-50 transition-colors"
                >
                  <div className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-3">
                      <div className="text-sm font-medium text-ink-900">
                        {b.firstName} {b.lastName}
                      </div>
                      {b.dateOfBirth && (
                        <div className="text-xs text-slateui-600">
                          DOB: {new Date(b.dateOfBirth).toLocaleDateString()}
                        </div>
                      )}
                      <div className="text-xs text-slateui-600">ID: {b.id.slice(0, 8)}...</div>
                    </div>
                    <div className="col-span-2">
                      <Link
                        href={`/dashboard/clients/${b.client.id}`}
                        className="text-sm text-ink-900 hover:text-blue-600"
                      >
                        {b.client.firstName} {b.client.lastName}
                      </Link>
                      <div className="text-xs text-slateui-600">{b.client.email}</div>
                    </div>
                    <div className="col-span-2 text-sm text-ink-900">
                      {b.relationship || "—"}
                    </div>
                    <div className="col-span-2 text-sm text-ink-900">
                      {b.email || "—"}
                    </div>
                    <div className="col-span-2 text-sm text-ink-900">
                      {b.phone || "—"}
                    </div>
                    <div className="col-span-1 text-right text-xs text-slateui-600">
                      {new Date(b.createdAt).toLocaleDateString()}
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
    console.error("BeneficiariesPage error:", error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Error</h1>
          <p className="text-sm text-slateui-600">
            Failed to load beneficiaries. Please try refreshing the page.
          </p>
          <p className="mt-2 text-xs text-slateui-600">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }
}
