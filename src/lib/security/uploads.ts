// src/lib/security/uploads.ts
export function validateUpload(file: File, opts: { maxBytes: number }) {
  const allowed = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
  ]);

  const mime = file.type || "application/octet-stream";
  if (!allowed.has(mime)) {
    throw new Error("Unsupported file type");
  }
  if (file.size > opts.maxBytes) {
    throw new Error("File too large");
  }
}

