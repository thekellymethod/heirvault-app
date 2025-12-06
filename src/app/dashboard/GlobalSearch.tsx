"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <input
        placeholder="Search clients or policies…"
        className="w-full rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {open && results && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/95 p-2 text-xs text-slate-50 shadow-xl">
          {loading && (
            <div className="px-2 py-1 text-slate-400">Searching…</div>
          )}
          {!loading && results.clients.length === 0 && results.policies.length === 0 && (
            <div className="px-2 py-1 text-slate-400">
              No results for &quot;{q}&quot;
            </div>
          )}
          {results.clients.length > 0 && (
            <div className="mb-1">
              <div className="px-2 py-1 text-[10px] uppercase text-slate-500">
                Clients
              </div>
              {results.clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => goToClient(c.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-slate-800/80"
                >
                  <span>
                    {c.firstName} {c.lastName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {c.email}
                  </span>
                </button>
              ))}
            </div>
          )}
          {results.policies.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] uppercase text-slate-500">
                Policies
              </div>
              {results.policies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goToClient(p.client.id)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-slate-800/80"
                >
                  <span>
                    {p.insurerName}{" "}
                    {p.policyNumber ? `(${p.policyNumber})` : ""}
                  </span>
                  <span className="text-[10px] text-slate-400">
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

