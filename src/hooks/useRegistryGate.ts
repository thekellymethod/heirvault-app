// src/hooks/useRegistryGate.ts
"use client";

import { useEffect, useState } from "react";

export function useRegistryGate() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);

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
    if (!active) {
      window.location.href = "/dashboard/billing?blocked=1";
      return false;
    }
    return true;
  };

  return { ready, active, gate };
}

