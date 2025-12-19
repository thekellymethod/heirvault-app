"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { DashboardLayout } from "../_components/DashboardLayout";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ClientsIndexPage() {
  const router = useRouter();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function loadClients() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/client");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to load clients" }));
          throw new Error(errorData?.error || "Failed to load clients");
        }
        const data = await res.json();
        if (!cancelled) {
          setClients(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadClients();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = React.useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.firstName.toLowerCase().includes(query) ||
        client.lastName.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        (client.phone && client.phone.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Clients</h1>
            <p className="mt-2 text-base text-slateui-600">Search, create, and manage client registries.</p>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard/clients/invite">
              <Button className="btn-primary">
                <Mail className="h-4 w-4 mr-2" />
                Invite Client
              </Button>
            </Link>
            <Link href="/dashboard/clients/new">
              <Button variant="outline" className="btn-secondary">New Client</Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <input
            type="text"
            placeholder="Search clients by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Client list */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="p-8 text-center text-slateui-600">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-slateui-600">
              {searchQuery ? "No clients found matching your search." : "No clients yet. Create your first client to get started."}
            </div>
          ) : (
            <div className="divide-y divide-slateui-200">
              {filteredClients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ClientRow({ client, onClick }: { client: Client; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-5 text-left transition-all hover:bg-paper-100 focus:bg-paper-100 focus:outline-none"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink-900">
              {client.firstName} {client.lastName}
            </h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slateui-600">
            <span>{client.email}</span>
            {client.phone && (
              <>
                <span className="text-slateui-300">•</span>
                <span>{client.phone}</span>
              </>
            )}
            {client.dateOfBirth && (
              <>
                <span className="text-slateui-300">•</span>
                <span>DOB: {client.dateOfBirth.slice(0, 10)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-slateui-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
