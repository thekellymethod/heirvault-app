// src/lib/billing/stripeInvoicePdf.ts
export async function downloadPdfBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download invoice PDF (${res.status})`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

