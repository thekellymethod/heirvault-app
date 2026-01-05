"use client";

import { useEffect, useState } from "react";

type FileRow = {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  category: string;
  createdAt: string;
};

export function FileList({ orgId, registryId }: { orgId: string; registryId: string }) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId || !registryId) return;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/files/list?orgId=${encodeURIComponent(orgId)}&registryId=${encodeURIComponent(registryId)}`);
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.message || "Failed to load files.");
        }
        const j = await r.json();
        setFiles(j.files || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load files.");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, registryId]);

  async function openSigned(fileId: string) {
    setErr(null);
    try {
      const r = await fetch("/api/files/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, fileId }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to open file.");
      }
      const j = await r.json();
      window.open(j.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setErr(e?.message || "Failed to open file.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-semibold text-white/90">Documents</div>
      {loading && (
        <div className="mt-4 text-sm text-white/55">Loading files...</div>
      )}
      {err && (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {err}
        </div>
      )}
      <div className="mt-4 space-y-2">
        {files.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm text-white/90">{f.originalName}</div>
              <div className="mt-1 text-xs text-white/55">
                {f.category} • {new Date(f.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => openSigned(f.id)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 hover:bg-white/10"
            >
              Open
            </button>
          </div>
        ))}
        {files.length === 0 && !loading && (
          <div className="text-sm text-white/60">No documents uploaded yet.</div>
        )}
      </div>
    </div>
  );
}
