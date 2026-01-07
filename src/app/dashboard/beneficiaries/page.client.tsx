"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyListState, EmptySearchState } from "@/components/ui/empty-state";
import { SortSelect } from "@/components/ui/sort-select";
import { ListSkeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";
import { MobileTable, DesktopTable, MobileCard } from "@/components/ui/mobile-table";

type Beneficiary = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export default function BeneficiariesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
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
    items: beneficiaries,
    itemsPerPage,
    initialPage: page,
  });

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  async function loadBeneficiaries() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/beneficiaries");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load beneficiaries");

      // Filter by search term if provided
      let filtered = data || [];
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((b: Beneficiary) =>
          `${b.firstName} ${b.lastName}`.toLowerCase().includes(term) ||
          b.client.firstName.toLowerCase().includes(term) ||
          b.client.lastName.toLowerCase().includes(term) ||
          b.email?.toLowerCase().includes(term) ||
          b.relationship?.toLowerCase().includes(term)
        );
      }

      // Sort
      filtered.sort((a: Beneficiary, b: Beneficiary) => {
        switch (sortBy) {
          case "clientName":
            return `${a.client.lastName} ${a.client.firstName}`.localeCompare(
              `${b.client.lastName} ${b.client.firstName}`
            );
          case "beneficiaryName":
            return `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`
            );
          case "relationship":
            return (a.relationship || "").localeCompare(b.relationship || "");
          case "createdAt":
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      setBeneficiaries(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/beneficiaries?${params.toString()}`);
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
    router.push(`/dashboard/beneficiaries?${params.toString()}`);
    loadBeneficiaries();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Beneficiaries</h1>
          <p className="text-sm text-slateui-600">
            View all beneficiaries across your authorized clients.
          </p>
        </div>
        <div className="rounded-xl border border-slateui-200 bg-white p-6">
          <ListSkeleton count={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Beneficiaries</h1>
          <p className="text-sm text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Beneficiaries</h1>
          <p className="text-sm text-slateui-600">
            View all beneficiaries across your authorized clients.
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
            placeholder="Search by name, client, relationship, or email..."
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
              href="/dashboard/beneficiaries"
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
            { value: "beneficiaryName", label: "Beneficiary Name" },
            { value: "relationship", label: "Relationship" },
          ]}
          className="rounded-lg border border-slateui-300 bg-white px-4 py-2 text-sm text-ink-900 focus:border-slateui-500 focus:outline-none w-full sm:w-auto"
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("sort", e.target.value);
            params.set("page", "1");
            router.push(`/dashboard/beneficiaries?${params.toString()}`);
            loadBeneficiaries();
          }}
        />
      </div>

      <div className="rounded-xl border border-slateui-200 bg-white">
        {beneficiaries.length === 0 ? (
          searchTerm ? (
            <EmptySearchState
              searchQuery={searchTerm}
              clearHref="/dashboard/beneficiaries"
            />
          ) : (
            <EmptyListState
              icon="Users"
              title="No beneficiaries found"
              description="Beneficiaries will appear here once clients are added and beneficiaries are created."
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
              <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900 min-w-[900px]">
                <div className="col-span-3">Beneficiary</div>
                <div className="col-span-2">Client</div>
                <div className="col-span-2">Relationship</div>
                <div className="col-span-2">Email</div>
                <div className="col-span-2">Phone</div>
                <div className="col-span-1 text-right">Created</div>
              </div>
              <div className="divide-y divide-slateui-200">
                {paginatedItems.map((b) => (
                  <div
                    key={b.id}
                    className="px-4 py-4 hover:bg-slateui-50 transition-colors"
                  >
                    <div className="grid grid-cols-12 items-center gap-2 min-w-[900px]">
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
            </DesktopTable>

            {/* Mobile Cards */}
            <MobileTable>
              <div className="divide-y divide-slateui-200 p-4">
                {paginatedItems.map((b) => (
                  <MobileCard
                    key={b.id}
                    onClick={() => router.push(`/dashboard/clients/${b.client.id}`)}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-base font-semibold text-ink-900">
                          {b.firstName} {b.lastName}
                        </div>
                        {b.relationship && (
                          <div className="text-sm text-slateui-600 mt-1">
                            {b.relationship}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-slateui-600">Client: </span>
                          <Link
                            href={`/dashboard/clients/${b.client.id}`}
                            className="text-ink-900 hover:text-blue-600"
                          >
                            {b.client.firstName} {b.client.lastName}
                          </Link>
                        </div>
                        {b.email && (
                          <div>
                            <span className="text-slateui-600">Email: </span>
                            <span className="text-ink-900">{b.email}</span>
                          </div>
                        )}
                        {b.phone && (
                          <div>
                            <span className="text-slateui-600">Phone: </span>
                            <span className="text-ink-900">{b.phone}</span>
                          </div>
                        )}
                        {b.dateOfBirth && (
                          <div>
                            <span className="text-slateui-600">DOB: </span>
                            <span className="text-ink-900">
                              {new Date(b.dateOfBirth).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-slateui-600">
                          Created: {new Date(b.createdAt).toLocaleDateString()}
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
