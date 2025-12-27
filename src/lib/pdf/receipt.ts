// src/lib/pdf/receipt.ts
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function makeReceiptPdf(params: {
  clientName: string;
  receiptNumber: string;
  receivedAt: Date;
  items: Array<{ docTypeLabel: string; statusLabel: string }>; // NO IDs/hashes
  overallStatusLabel: string; // e.g., "Pending Review" / "Accepted"
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  page.drawText("HeirVault — Submission Receipt", { x: 50, y, size: 18, font: bold });
  y -= 28;

  page.drawText(`Policyholder: ${params.clientName}`, { x: 50, y, size: 12, font });
  y -= 16;
  page.drawText(`Receipt Number: ${params.receiptNumber}`, { x: 50, y, size: 12, font: bold });
  y -= 16;
  page.drawText(`Received: ${params.receivedAt.toLocaleString()}`, { x: 50, y, size: 11, font });
  y -= 24;

  page.drawText("Documents received:", { x: 50, y, size: 12, font: bold });
  y -= 16;

  for (const it of params.items) {
    page.drawText(`• ${it.docTypeLabel} — ${it.statusLabel}`, { x: 60, y, size: 11, font });
    y -= 14;
  }

  y -= 18;
  page.drawText("Processing status:", { x: 50, y, size: 12, font: bold });
  y -= 16;
  page.drawText(params.overallStatusLabel, { x: 60, y, size: 11, font });

  y -= 28;
  page.drawText("Next steps:", { x: 50, y, size: 12, font: bold });
  y -= 16;
  const lines = [
    "• If additional verification is required, you may receive a request to resubmit unclear or incomplete documents.",
    "• Keep this receipt for your records. Future changes may require verification.",
  ];
  for (const line of lines) {
    page.drawText(line, { x: 60, y, size: 10, font });
    y -= 13;
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

