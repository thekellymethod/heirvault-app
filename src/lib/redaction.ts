// src/lib/redaction.ts
// Redaction is required for S4/S5 previews.
// Implement later with a proper PDF/image redaction pipeline.
// For now: return original and force "review original" to be restricted in UI.
export async function generateRedactedPreview(_buf: Buffer) {
  return null as Buffer | null;
}

