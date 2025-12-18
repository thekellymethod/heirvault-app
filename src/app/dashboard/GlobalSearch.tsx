"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  clients: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
  policies: {
    id: string;
    insurerName: string;
    policyNumber: string | null;
    client: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[];
}

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!q) {
      setResults(null);
      setOpen(false);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        // swallow for now
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [q]);

  function goToClient(id: string) {
    setOpen(false);
    setQ("");
    router.push(`/dashboard/clients/${id}`);
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="flex items-center gap-2">
        <input
          placeholder="Search your clients or policies..."
          className="flex-1 rounded-xl border border-slateui-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder-slateui-400 focus:outline-none focus:ring-2 focus:border-gold-400 focus:ring-gold-400/20"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Link
          href="/dashboard/policy-locator"
          className="text-xs font-medium text-slateui-600 hover:text-ink-900 whitespace-nowrap transition"
          title="Policy Locator & Global Search"
        >
          Search
        </Link>
      </div>
      {open && results && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slateui-200 bg-white p-2 text-xs text-ink-900 shadow-lift">
          {loading && (
            <div className="px-3 py-2 text-slateui-600">Searching…</div>
          )}
          {!loading && results.clients.length === 0 && results.policies.length === 0 && (
            <div className="px-3 py-2 text-slateui-600">
              No results for &quot;{q}&quot;
            </div>
          )}
          {results.clients.length > 0 && (
            <div className="mb-1">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slateui-500">
                Clients
              </div>
              {results.clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goToClient(c.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-paper-100 transition"
                >
                  <span className="font-medium">
                    {c.firstName} {c.lastName}
                  </span>
                  <span className="text-[10px] text-slateui-500">
                    {c.email}
                  </span>
                </button>
              ))}
            </div>
          )}
          {results.policies.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slateui-500">
                Policies
              </div>
              {results.policies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goToClient(p.client.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-paper-100 transition"
                >
                  <span className="font-medium">
                    {p.insurerName}{" "}
                    {p.policyNumber ? `(${p.policyNumber})` : ""}
                  </span>
                  <span className="text-[10px] text-slateui-500">
                    {p.client.firstName} {p.client.lastName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

