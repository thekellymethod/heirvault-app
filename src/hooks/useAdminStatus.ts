// src/hooks/useAdminStatus.ts
"use client";

import { useEffect, useState } from "react";

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/debug/whoami");
        const j = await r.json().catch(() => ({}));
        if (!cancelled) setIsAdmin(!!j?.isAdmin);
      } catch (e) {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { isAdmin, loading };
}
