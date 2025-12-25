import { supabaseServer } from "@/lib/supabase";
import { sha256Buffer } from "@/lib/hash";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);

function safeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export async function uploadDocument(input: {
  fileBuffer: ArrayBuffer;
  filename: string,
  contentType: string,
}): Promise<{ storagePath: string, sizeBytes: number; sha256: string }> {
  if (!ALLOWED.has(input.contentType)) throw new Error("Unsupported file type.");
  const buf = Buffer.from(input.fileBuffer);
  if (buf.byteLength > MAX_BYTES) throw new Error("File too large (max 15MB).");

  const sha256 = await sha256Buffer(buf);
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

  const bucket = process.env.HEIRVAULT_STORAGE_BUCKET || "heirvault-docs";
  const path = `documents/${yyyy}/${mm}/${sha256}-${safeFilename(input.filename)}`;

  const sb = supabaseServer();
  const { error } = await sb.storage.from(bucket).upload(path, buf, {
    contentType: input.contentType,
    upsert: false,
  });

  if (error) throw error;

  return { storagePath: path, sizeBytes: buf.byteLength, sha256 };
}
