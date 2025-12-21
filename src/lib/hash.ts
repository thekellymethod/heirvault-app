import { createHash } from "node:crypto";

export async function sha256Buffer(buffer: ArrayBuffer | Buffer): Promise<string> {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return createHash("sha256").update(buf).digest("hex");
}

export async function sha256String(text: string): Promise<string> {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
