// src/lib/pdf/changeReceipt.ts
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function makeChangeReceiptPdf(params: {
  clientName: string;
  receiptNumber: string;
  receivedAt: Date;
  requestTypeLabel: string;
  items: Array<{ docTypeLabel: string; statusLabel: string }>;
  note?: string | null;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  page.drawText("HeirVault — Change Request Receipt", { x: 50, y, size: 18, font: bold });
  y -= 28;

  page.drawText(`Policyholder: ${params.clientName}`, { x: 50, y, size: 12, font });
  y -= 16;
  page.drawText(`Receipt Number: ${params.receiptNumber}`, { x: 50, y, size: 12, font: bold });
  y -= 16;
  page.drawText(`Received: ${params.receivedAt.toLocaleString()}`, { x: 50, y, size: 11, font });
  y -= 16;
  page.drawText(`Request Type: ${params.requestTypeLabel}`, { x: 50, y, size: 11, font });
  y -= 22;

  if (params.note) {
    page.drawText("Policyholder note:", { x: 50, y, size: 12, font: bold });
    y -= 16;
    page.drawText(params.note.slice(0, 240), { x: 60, y, size: 10, font });
    y -= 22;
  }

  page.drawText("Documents received:", { x: 50, y, size: 12, font: bold });
  y -= 16;

  for (const it of params.items) {
    if (y < 80) break;
    page.drawText(`• ${it.docTypeLabel} — ${it.statusLabel}`, { x: 60, y, size: 11, font });
    y -= 14;
  }

  y -= 16;
  page.drawText("Next steps:", { x: 50, y, size: 12, font: bold });
  y -= 16;
  const lines = [
    "• Your change request will be verified and may require attorney/admin review.",
    "• If additional clarity is needed, you may receive a request to resubmit.",
    "• Keep this receipt for your records.",
  ];
  for (const line of lines) {
    if (y < 60) break;
    page.drawText(line, { x: 60, y, size: 10, font });
    y -= 13;
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

