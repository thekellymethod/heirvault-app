import { requireAttorney } from "@/lib/auth";
import { requireAccessRegistry } from "@/lib/permissions";
import { getRegistryById, getRegistryVersions, getDocumentsForRegistry } from "@/lib/db";
import { logAccess } from "@/lib/audit";
import styles from "./page.module.css";

export default async function RecordDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAttorney();
  // Ensure the user has access to this registry
  await requireAccessRegistry({ user, registryId: params.id });

  const registry = await getRegistryById(params.id);

  if (!registry) {
    return (
      <main className={styles.main}>
        <h1>Not Found</h1>
        <p>Registry record not found.</p>
      </main>
    );
  }

  const versions = await getRegistryVersions(registry.id);
  const docs = await getDocumentsForRegistry(registry.id);

  await logAccess({
    userId: user.id,
    registryId: registry.id,
    action: "REGISTRY_VIEW",
    metadata: { versions: versions.length, documents: docs.length },
  });

  return (
    <main className={styles.main}>
      <h1>Registry Record</h1>
      <p><strong>Decedent Name:</strong> {registry.decedentName}</p>
      <p><strong>Status:</strong> {registry.status}</p>

      <h2 className={styles.sectionTitle}>Versions</h2>
      <div className={styles.versionsGrid}>
        {versions.map((v) => (
          <div key={v.id} className={styles.versionCard}>
            <div><strong>{v.submitted_by}</strong> — {new Date(v.created_at).toLocaleString()}</div>
            <div className={styles.hash}>hash: {v.hash}</div>
            <pre className={styles.jsonContent}>
              {JSON.stringify(v.data_json, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>Documents</h2>
      <div className={styles.documentsGrid}>
        {docs.map((d) => (
          <div key={d.id} className={styles.documentCard}>
            <div><strong>{d.content_type}</strong> — {Math.round(d.size_bytes / 1024)} KB</div>
            <div className={styles.metadata}>sha256: {d.sha256}</div>
            <div className={styles.metadata}>path: {d.storage_path}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
