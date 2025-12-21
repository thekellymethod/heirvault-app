import { requireAttorney } from "@/lib/auth";
import { listAuthorizedRegistries } from "@/lib/db";
import { logAccess } from "@/lib/audit";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const user = await requireAttorney();
  // Only load registries this user has permission to access
  const registries = await listAuthorizedRegistries(user.id, 50);

  await logAccess({ userId: user.id, action: "DASHBOARD_VIEW", metadata: { count: registries.length } });

  return (
    <main className={styles.main}>
      <h1>Dashboard</h1>
      <p>Signed in as: {user.email ?? user.id} ({user.role})</p>

      <div className={styles.registriesGrid}>
        {registries.map((r) => (
          <a key={r.id} href={`/records/${r.id}`} className={styles.registryCard}>
            <div><strong>{r.insured_name}</strong></div>
            <div>Carrier: {r.carrier_guess ?? "—"}</div>
            <div>Status: {r.status}</div>
            <div className={styles.timestamp}>{new Date(r.created_at).toLocaleString()}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
