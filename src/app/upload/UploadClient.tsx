"use client";

import { useEffect, useState } from "react";

type FileRow = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | null;
  status: string;
  createdAt: string;
};

export default function UploadClient({ sessionId }: { sessionId: string }) {
  const [ready, setReady] = useState(false);
  const [registryId, setRegistryId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [files, setFiles] = useState<FileRow[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  async function loadFiles(regId: string) {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/registry/files?registryId=${encodeURIComponent(regId)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (e: any) {
      // don't hard-fail UI for list
      console.error(e?.message ?? e);
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/registry/from-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRegistryId(data.registryId);
        setReady(true);
        await loadFiles(data.registryId);
      } catch (e: any) {
        setError(e?.message ?? "Unable to verify payment session.");
      }
    })();
  }, [sessionId]);

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList || !registryId) return;
    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(fileList)) {
        const initRes = await fetch("/api/upload/init", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            registryId,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
        });
        if (!initRes.ok) throw new Error(await initRes.text());
        const { uploadUrl, fileAssetId } = await initRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload failed");

        const doneRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileAssetId }),
        });
        if (!doneRes.ok) throw new Error(await doneRes.text());
      }

      await loadFiles(registryId);
      alert("Upload complete. We will confirm when your registry is finalized.");
    } catch (e: any) {
      setError(e?.message ?? "Upload error");
    } finally {
      setUploading(false);
    }
  }

  if (error) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!ready) return <div>Verifying payment…</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Registry ID: <b>{registryId}</b>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontWeight: 700 }}>Upload policy documents</label>
        <input
          type="file"
          multiple
          accept=".pdf,image/*"
          disabled={uploading}
          onChange={(e) => onFilesSelected(e.target.files)}
        />
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Accepted: PDF, photos of policy pages, annual statements. Do not upload passwords.
        </div>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Uploaded Files</h3>
          <button
            onClick={() => loadFiles(registryId)}
            disabled={loadingFiles}
            style={{ padding: "6px 10px" }}
          >
            {loadingFiles ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {files.length === 0 ? (
          <p style={{ opacity: 0.75, marginTop: 10 }}>No files uploaded yet.</p>
        ) : (
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {files.map((f) => (
              <li key={f.id} style={{ marginBottom: 8 }}>
                <b>{f.originalName}</b>{" "}
                <span style={{ opacity: 0.75 }}>
                  — {f.status}
                  {typeof f.sizeBytes === "number" ? ` — ${(f.sizeBytes / 1024).toFixed(1)} KB` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
