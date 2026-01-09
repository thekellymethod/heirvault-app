"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyListState, EmptySearchState } from "@/components/ui/empty-state";
import { SortSelect } from "@/components/ui/sort-select";
import { PolicyListSkeleton } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";
import { MobileTable, DesktopTable, MobileCard } from "@/components/ui/mobile-table";

type Policy = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  carrierNameRaw: string | null;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  insurer: {
    id: string;
    name: string;
  } | null;
  displayName: string;
  isUnresolved: boolean;
};

export default function PoliciesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchTerm = searchParams.get("search") || "";
  const sortBy = searchParams.get("sort") || "createdAt";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const itemsPerPage = 20;

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({
    items: policies,
    itemsPerPage,
    initialPage: page,
  });

  useEffect(() => {
    loadPolicies();
  }, [searchTerm, sortBy]);

  async function loadPolicies() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (sortBy) params.set("sort", sortBy);

      const res = await fetch(`/api/policies/list?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load policies");

      setPolicies(data.policies || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/policies?${params.toString()}`);
    goToPage(newPage);
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sortBy) params.set("sort", sortBy);
    params.set("page", "1");
    router.push(`/dashboard/policies?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Policies</h1>
          <p className="text-sm text-slateui-600">
            View all policies across your authorized clients.
          </p>
        </div>
        <PolicyListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Policies</h1>
          <p className="text-sm text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Policies</h1>
          <p className="text-sm text-slateui-600">
            View all policies across your authorized clients.
            {totalItems > 0 && (
              <span className="ml-2">
                Showing {startIndex}-{endIndex} of {totalItems}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            name="search"
            placeholder="Search by policy number, type, insurer, or client name..."
            defaultValue={searchTerm}
            className="flex-1 rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 placeholder:text-slateui-400 focus:border-slateui-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 hover:bg-slateui-50 transition-colors whitespace-nowrap"
          >
            Search
          </button>
          {searchTerm && (
            <Link
              href="/dashboard/policies"
              className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 hover:bg-slateui-50 transition-colors whitespace-nowrap"
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
          className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 focus:border-slateui-500 focus:outline-none w-full sm:w-auto"
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("sort", e.target.value);
            params.set("page", "1");
            router.push(`/dashboard/policies?${params.toString()}`);
          }}
        />
      </div>

      <div className="rounded-xl border border-slateui-200 bg-white">
        {policies.length === 0 ? (
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
          <>
            {/* Desktop Table */}
            <DesktopTable>
              <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900 min-w-[1000px]">
                <div className="col-span-3">Policy</div>
                <div className="col-span-2">Client</div>
                <div className="col-span-2">Insurer</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Created</div>
              </div>
              <div className="divide-y divide-slateui-200">
                {paginatedItems.map((p) => (
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
                        <div className="text-xs text-slateui-600">ID: {p.id.slice(0, 8)}...</div>
                      </div>
                      <div className="col-span-2">
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
            </DesktopTable>

            {/* Mobile Cards */}
            <MobileTable>
              <div className="divide-y divide-slateui-200 p-4">
                {paginatedItems.map((p) => (
                  <MobileCard
                    key={p.id}
                    onClickAction={() => router.push(`/dashboard/policies/${p.id}`)}
                  >
                    <div className="space-y-3">
                      <div>
                        <Link
                          href={`/dashboard/policies/${p.id}`}
                          className="text-base font-semibold text-ink-900 hover:text-blue-600"
                        >
                          {p.policyNumber || "Policy"}
                        </Link>
                        <div className="text-xs text-slateui-600 mt-1">
                          {p.policyType || "No type specified"}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-slateui-600">Client: </span>
                          <Link
                            href={`/dashboard/clients/${p.client.id}`}
                            className="text-ink-900 hover:text-blue-600"
                          >
                            {p.client.firstName} {p.client.lastName}
                          </Link>
                        </div>
                        <div>
                          <span className="text-slateui-600">Insurer: </span>
                          <span className="text-ink-900">{p.displayName}</span>
                          {p.isUnresolved && (
                            <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                              Unresolved
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-slateui-600">Status: </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
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
                        <div className="text-xs text-slateui-600">
                          Created: {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>
            </MobileTable>

            {totalPages > 1 && (
              <div className="border-t border-slateui-200 px-4 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
