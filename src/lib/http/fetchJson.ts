// src/lib/http/fetchJson.ts
export async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));

  if (res.status === 402) {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard/billing?blocked=1";
    }
    throw new Error("Billing required");
  }

  if (!res.ok) {
    throw new Error(json?.error || "Request failed");
  }

  return json;
}

