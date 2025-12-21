import { requireAttorney } from "@/lib/auth";
import { listRegistries } from "@/lib/db";
import { logAccess } from "@/lib/audit";

export default async function DashboardPage() {
  const user = await requireAttorney();
  const registries = await listRegistries(50);

  await logAccess({ userId: user.id, action: "DASHBOARD_VIEW", metadata: { count: registries.length } });

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Dashboard</h1>
      <p>Signed in as: {user.email ?? user.id} ({user.role})</p>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {registries.map((r) => (
          <a key={r.id} href={`/records/${r.id}`} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <div><strong>{r.insured_name}</strong></div>
            <div>Carrier: {r.carrier_guess ?? "—"}</div>
            <div>Status: {r.status}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(r.created_at).toLocaleString()}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
