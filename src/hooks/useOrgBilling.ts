// src/hooks/useOrgBilling.ts
"use client";

import { useEffect, useState } from "react";

export function useOrgBilling() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/org/me");
        const j = await r.json().catch(() => ({}));
        if (!cancelled) setOrg(j?.org ?? null);
      } catch (e) {
        if (!cancelled) setOrg(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { org, loading, isActive: !!org?.active };
}

