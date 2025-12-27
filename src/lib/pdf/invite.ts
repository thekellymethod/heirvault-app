// src/lib/pdf/invite.ts
import { PDFDocument, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export async function makeInvitePdf(params: {
  clientName: string;
  attorneyName: string;
  inviteCode: string;     // you will show a short code derived from token
  uploadUrl: string;      // includes token
  requiresTax?: boolean;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const qrDataUrl = await QRCode.toDataURL(params.uploadUrl, { margin: 1, scale: 6 });
  const qrPng = await pdf.embedPng(qrDataUrl);

  let y = 740;
  page.drawText("HeirVault — Secure Upload Invitation", { x: 50, y, size: 18, font: bold });
  y -= 28;

  page.drawText(`Policyholder: ${params.clientName}`, { x: 50, y, size: 12, font });
  y -= 16;
  page.drawText(`Issued by: ${params.attorneyName}`, { x: 50, y, size: 12, font });
  y -= 24;

  page.drawText("What to upload:", { x: 50, y, size: 12, font: bold });
  y -= 16;
  const items = [
    "• Government ID (Driver's License preferred)",
    "• Insurance policy document",
    "• Beneficiary designation page or beneficiary documents (if applicable)",
    ...(params.requiresTax ? ["• Tax documents requested for verification (if applicable)"] : []),
  ];
  for (const line of items) {
    page.drawText(line, { x: 60, y, size: 11, font });
    y -= 14;
  }

  y -= 10;
  page.drawText("How to submit:", { x: 50, y, size: 12, font: bold });
  y -= 16;
  page.drawText(`Invite Code: ${params.inviteCode}`, { x: 60, y, size: 12, font: bold });
  y -= 16;
  page.drawText("Scan the QR code or use the secure link provided in your email.", { x: 60, y, size: 11, font });

  // QR
  page.drawImage(qrPng, { x: 410, y: 520, width: 140, height: 140 });

  y -= 36;
  page.drawText("Security notice:", { x: 50, y, size: 12, font: bold });
  y -= 16;
  const sec = [
    "• Your documents are transmitted over encrypted connections and stored in a private, access-controlled system.",
    "• Only authorized parties may access your uploaded records.",
    "• Do not forward your invite link or QR code to anyone.",
  ];
  for (const line of sec) {
    page.drawText(line, { x: 60, y, size: 10, font });
    y -= 13;
  }

  y -= 18;
  page.drawText("Acknowledgment (optional):", { x: 50, y, size: 12, font: bold });
  y -= 16;
  page.drawText("I confirm I am submitting my own documents and/or documents I am authorized to provide.", { x: 60, y, size: 10, font });
  y -= 28;
  page.drawText("Signature: ____________________________   Date: _______________", { x: 60, y, size: 10, font });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

