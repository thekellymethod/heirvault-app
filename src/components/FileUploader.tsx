"use client";

import { useMemo, useRef, useState, useEffect } from "react";

type UploadedItem = {
  fileId: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
  registryId?: string | null;
  policyId?: string | null;
};

type Props = {
  orgId: string;
  registryId?: string;
  policyId?: string;
  category?: string; // "policies" | "proofs" | "uploads"
  onUploadedAction?: (item: UploadedItem) => void;
  autoLoad?: boolean; // Load existing files on mount
};

const GOLD = "#C9A227";

export function FileUploader({
  orgId,
  registryId,
  policyId,
  category = "uploads",
  onUploadedAction,
  autoLoad = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<UploadedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const prettyBytes = useMemo(() => (n: number) => formatBytes(n), []);

  // Load existing files on mount
  useEffect(() => {
    if (autoLoad && orgId) {
      loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, registryId, policyId, autoLoad]);

  async function loadFiles() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ orgId });
      if (registryId) params.set("registryId", registryId);
      if (policyId) params.set("policyId", policyId);

      const res = await fetch(`/api/files?${params.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to load files.");
      }

      const data = (await res.json()) as { ok: true; files: UploadedItem[] };
      setItems(data.files);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load files.";
      setErr(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setErr(null);
    setProgress(0);

    // Optional: basic guards
    if (f.size > 35 * 1024 * 1024) {
      setErr("File too large. Max 35MB for this upload route.");
      resetInput();
      return;
    }

    try {
      setBusy(true);

      // 1) Ask server for signed upload URL (and create FileAsset row)
      const createRes = await fetch("/api/storage/create-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          registryId: registryId ?? null,
          category,
          originalName: f.name,
          mimeType: f.type || "application/octet-stream",
          byteSize: f.size,
        }),
      });

      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to initialize upload.");
      }

      const init = (await createRes.json()) as {
        ok: true;
        fileId: string;
        signedUrl: string;
        bucket: string;
        path: string;
      };

      // 2) Upload file directly to signed URL with progress
      await putWithProgress(init.signedUrl, f, (p) => setProgress(p));

      // 3) Confirm/attach upload (authoritative DB link)
      const attachRes = await fetch("/api/files/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          fileId: init.fileId,
          registryId: registryId ?? null,
          policyId: policyId ?? null,
        }),
      });

      if (!attachRes.ok) {
        const j = await attachRes.json().catch(() => ({}));
        throw new Error(j?.message || "Upload completed but attach failed.");
      }

      const newItem: UploadedItem = {
        fileId: init.fileId,
        originalName: f.name,
        mimeType: f.type || "application/octet-stream",
        byteSize: f.size,
        createdAt: new Date().toISOString(),
        registryId: registryId || null,
        policyId: policyId || null,
      };

      setItems((prev) => [newItem, ...prev]);
      onUploadedAction?.(newItem);

      setProgress(100);
      resetInput();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Upload failed.";
      setErr(errorMessage);
      resetInput();
    } finally {
      setBusy(false);
      // Keep 100% visible briefly, then reset
      setTimeout(() => setProgress(0), 800);
    }
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function preview(fileId: string) {
    setErr(null);
    const res = await fetch("/api/files/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, fileId }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.message || "Failed to generate preview link.");
      return;
    }

    const j = (await res.json()) as { ok: true; signedUrl: string };
    window.open(j.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function download(fileId: string) {
    // same as preview, but we still just open signed URL
    await preview(fileId);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white/90">Upload document</div>
          <div className="mt-1 text-xs text-white/55">
            Upload policy copies, beneficiary letters, claim proof, or supporting documents.
          </div>
        </div>

        <label
          className={[
            "inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
            busy ? "bg-[#C9A227]/60 text-black/70" : "bg-[#C9A227] text-black hover:brightness-95",
          ].join(" ")}
        >
          {busy ? "Uploading…" : "Choose file"}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handlePickFile}
            disabled={busy}
          />
        </label>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: GOLD,
                transition: "width 120ms linear",
              }}
            />
          </div>
          <div className="mt-2 text-xs text-white/55">{progress.toFixed(0)}%</div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {err}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-6 text-sm text-white/55">Loading files...</div>
      )}

      {/* Uploaded list */}
      {items.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
              {autoLoad ? "Files" : "Recently uploaded"}
            </div>
            {autoLoad && (
              <button
                onClick={loadFiles}
                className="text-xs text-white/55 hover:text-white/85"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {items.map((it) => (
              <div
                key={it.fileId}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-white/90">{it.originalName}</div>
                  <div className="mt-1 text-xs text-white/55">
                    {prettyBytes(it.byteSize)} • {it.mimeType || "file"}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => preview(it.fileId)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 hover:bg-white/10"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => download(it.fileId)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 hover:bg-white/10"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PUT upload with progress.
 * Uses XHR because fetch upload progress is still not consistently available.
 */
function putWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (p: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);

    // Supabase signed upload URLs generally accept raw bytes
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = (evt.loaded / evt.total) * 100;
      onProgress(Math.max(1, Math.min(100, pct)));
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };

    xhr.send(file);
  });
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const v = bytes / Math.pow(k, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}
