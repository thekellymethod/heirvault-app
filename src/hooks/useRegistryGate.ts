// src/hooks/useRegistryGate.ts
"use client";

import { useEffect, useState } from "react";
import { useAdminStatus } from "./useAdminStatus";

export function useRegistryGate() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org/me");
        const json = await res.json().catch(() => ({}));
        const isActive = !!json?.org?.active;
        if (!cancelled) setActive(isActive);
      } catch (e) {
        if (!cancelled) setActive(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const gate = () => {
    // Admin bypass - admins can always proceed
    if (isAdmin) {
      return true;
    }
    
    if (!active) {
      window.location.href = "/dashboard/billing?blocked=1";
      return false;
    }
    return true;
  };

  // Admin override: treat as active if admin
  const effectiveActive = isAdmin || active;
  const effectiveReady = ready && !adminLoading;

  return { ready: effectiveReady, active: effectiveActive, gate };
}

