import { PDFDocument, StandardFonts } from "pdf-lib";

export async function buildRegistrySummaryPdfBytes(input: {
  registryId: string;
  clientName: string;
  clientEmail: string;
  completedAt: Date;
  files: { originalName: string; status: string; createdAt: Date }[];
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 60;

  // Header (logo placeholder text – swap to image later)
  page.drawText("HEIRVAULT", {
    x: 50,
    y,
    size: 22,
    font: fontBold,
  });

  y -= 20;
  page.drawText("Life Insurance Policy Registry Summary", {
    x: 50,
    y,
    size: 11,
    font,
  });

  y -= 30;
  page.drawText(`Registry ID: ${input.registryId}`, { x: 50, y, size: 10, font });
  y -= 16;
  page.drawText(`Client: ${input.clientName || "(No name)"} — ${input.clientEmail}`, {
    x: 50,
    y,
    size: 10,
    font,
  });
  y -= 16;
  page.drawText(`Completed: ${input.completedAt.toLocaleString()}`, { x: 50, y, size: 10, font });

  y -= 26;
  page.drawText("Uploaded Files", { x: 50, y, size: 12, font: fontBold });
  y -= 16;

  const rows = input.files.length ? input.files : [{ originalName: "No files uploaded", status: "", createdAt: new Date() }];

  for (const f of rows) {
    if (y < 70) {
      // add new page if needed
      const p = pdfDoc.addPage([612, 792]);
      y = 740;
      p.drawText("Uploaded Files (continued)", { x: 50, y, size: 12, font: fontBold });
      y -= 18;

      p.drawText(`${f.originalName}`, { x: 50, y, size: 10, font });
      y -= 14;
      continue;
    }

    page.drawText(`${f.originalName}`, { x: 50, y, size: 10, font });
    y -= 12;
    if (f.status) {
      page.drawText(`Status: ${f.status} • Added: ${new Date(f.createdAt).toLocaleString()}`, {
        x: 62,
        y,
        size: 9,
        font,
      });
      y -= 14;
    } else {
      y -= 6;
    }
  }

  y = Math.max(y - 12, 60);
  page.drawText("Notes:", { x: 50, y, size: 10, font: fontBold });
  y -= 14;
  page.drawText("HeirVault organizes policy records and does not provide legal, tax, or insurance advice.", {
    x: 50,
    y,
    size: 9,
    font,
  });

  const bytes = await pdfDoc.save();
  return new Uint8Array(bytes);
}
