// src/hooks/useOrgBilling.ts
"use client";

import { useEffect, useState } from "react";

type Org = {
  active?: boolean;
  [key: string]: unknown;
};

export function useOrgBilling() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/org/me");
        const j = await r.json().catch(() => ({}));
        if (!cancelled) setOrg(j?.org ?? null);
      } catch (_e) {
        if (!cancelled) setOrg(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Only the org's billing flag counts — admins see the same banner so they can open /dashboard/billing
  const isActive = !!org?.active;

  return { org, loading, isActive };
}

