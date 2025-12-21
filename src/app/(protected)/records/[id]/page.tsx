import { requireAttorney } from "@/lib/auth";
import { getRegistryById, getRegistryVersions, getDocumentsForRegistry } from "@/lib/db";
import { logAccess } from "@/lib/audit";

export default async function RecordDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAttorney();
  const registry = await getRegistryById(params.id);

  if (!registry) {
    return (
      <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
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
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Registry Record</h1>
      <p><strong>Insured:</strong> {registry.insured_name}</p>
      <p><strong>Carrier:</strong> {registry.carrier_guess ?? "—"}</p>
      <p><strong>Status:</strong> {registry.status}</p>

      <h2 style={{ marginTop: 24 }}>Versions</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {versions.map((v) => (
          <div key={v.id} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <div><strong>{v.submitted_by}</strong> — {new Date(v.created_at).toLocaleString()}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>hash: {v.hash}</div>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(v.data_json, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Documents</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {docs.map((d) => (
          <div key={d.id} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <div><strong>{d.content_type}</strong> — {Math.round(d.size_bytes / 1024)} KB</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>sha256: {d.sha256}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>path: {d.storage_path}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
