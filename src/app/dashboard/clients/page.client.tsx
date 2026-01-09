"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyListState } from "@/components/ui/empty-state";
import { CreateClientButton } from "@/components/CreateClientButton";
import { ClientListSkeleton } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/usePagination";
import { MobileTable, DesktopTable, MobileCard } from "@/components/ui/mobile-table";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  updatedAt: string;
  createdAt: string;
};

export default function ClientsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverPagination, setServerPagination] = useState<{ total: number; totalPages: number } | null>(null);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const itemsPerPage = 20;
  const searchTerm = searchParams.get("search") || "";

  const {
    currentPage,
    totalPages: clientTotalPages,
    paginatedItems,
    goToPage,
    startIndex,
    endIndex,
    totalItems: clientTotalItems,
  } = usePagination({
    items: clients,
    itemsPerPage,
    initialPage: page,
  });

  // Use server pagination if available, otherwise client pagination
  const effectiveTotalPages = serverPagination?.totalPages ?? clientTotalPages;
  const effectiveTotalItems = serverPagination?.total ?? clientTotalItems;

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, page]);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", itemsPerPage.toString());
      
      const res = await fetch(`/api/clients?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load clients");
      
      // Handle paginated response
      let clientList: Client[] = [];
      if (data.items && data.pagination) {
        // Server-side paginated response
        clientList = data.items.map((c: Client) => ({
          id: c.id,
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          email: c.email || "",
          phone: c.phone || null,
          updatedAt: c.updatedAt || c.createdAt || new Date().toISOString(),
          createdAt: c.createdAt || new Date().toISOString(),
        }));
        setServerPagination({
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
      } else {
        // Fallback for non-paginated response
        clientList = (data.clients || []).map((c: Client) => ({
          id: c.id,
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          email: c.email || "",
          phone: c.phone || null,
          updatedAt: c.updatedAt || c.createdAt || new Date().toISOString(),
          createdAt: c.createdAt || new Date().toISOString(),
        }));
        
        // Filter by search if provided (client-side filtering for non-paginated)
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          clientList = clientList.filter((c: Client) =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            c.phone?.toLowerCase().includes(term)
          );
        }
        setServerPagination(null);
      }
      
      setClients(clientList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/dashboard/clients?${params.toString()}`);
    goToPage(newPage);
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">Clients</h1>
            <p className="text-sm text-slateui-600">
              Create and manage client registry profiles.
            </p>
          </div>
          <CreateClientButton />
        </div>
        <ClientListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Clients</h1>
          <p className="text-sm text-red-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Clients</h1>
          <p className="text-sm text-slateui-600">
            Create and manage client registry profiles.
            {effectiveTotalItems > 0 && (
              <span className="ml-2">
                Showing {startIndex}-{Math.min(endIndex, effectiveTotalItems)} of {effectiveTotalItems}
              </span>
            )}
          </p>
        </div>
        <CreateClientButton />
      </div>

      <div className="rounded-xl border border-slateui-200 bg-white overflow-x-auto">
        {clients.length === 0 ? (
          <EmptyListState
            icon="Users"
            title="No clients yet"
            description="Get started by creating your first client profile. Clients can then be invited to complete their life insurance registry."
            action={{
              label: "Create Client",
              href: "/dashboard/clients/new",
            }}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <DesktopTable>
              <div className="grid grid-cols-12 gap-2 border-b border-slateui-200 px-4 py-3 text-xs font-semibold text-ink-900 min-w-[800px]">
                <div className="col-span-4">Client</div>
                <div className="col-span-4 hidden md:block">Email</div>
                <div className="col-span-2 hidden sm:block">Phone</div>
                <div className="col-span-2 text-right">Updated</div>
              </div>
              <div className="divide-y divide-slateui-200">
                {paginatedItems.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/clients/${c.id}`}
                    className="block px-4 py-4 hover:bg-slateui-50 transition-colors"
                  >
                    <div className="grid grid-cols-12 items-center gap-2 min-w-[800px]">
                      <div className="col-span-4">
                        <div className="text-sm font-medium text-ink-900">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-xs text-slateui-600">
                          ID: {c.id.substring(0, 8)}...
                        </div>
                      </div>
                      <div className="col-span-4 text-sm text-ink-900 hidden md:block">
                        {c.email}
                      </div>
                      <div className="col-span-2 text-sm text-ink-900 hidden sm:block">
                        {c.phone ?? "—"}
                      </div>
                      <div className="col-span-2 text-right text-xs text-slateui-600">
                        {new Date(c.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </DesktopTable>

            {/* Mobile Cards */}
            <MobileTable>
              <div className="divide-y divide-slateui-200 p-4">
                {paginatedItems.map((c) => (
                  <MobileCard
                    key={c.id}
                    onClickAction={() => router.push(`/dashboard/clients/${c.id}`)}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="text-base font-semibold text-ink-900">
                          {c.firstName} {c.lastName}
                        </div>
                        <div className="text-xs text-slateui-600 mt-1">
                          ID: {c.id.substring(0, 8)}...
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-slateui-600">Email: </span>
                          <span className="text-ink-900">{c.email}</span>
                        </div>
                        {c.phone && (
                          <div>
                            <span className="text-slateui-600">Phone: </span>
                            <span className="text-ink-900">{c.phone}</span>
                          </div>
                        )}
                        <div className="text-xs text-slateui-600">
                          Updated: {new Date(c.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </MobileCard>
                ))}
              </div>
            </MobileTable>

            {effectiveTotalPages > 1 && (
              <div className="border-t border-slateui-200 px-4 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={effectiveTotalPages}
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
