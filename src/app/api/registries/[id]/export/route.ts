import { NextRequest, NextResponse } from "next/server";
import { requireRegistryAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Export Policy Registry Summary PDF
 */
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { registry } = await requireRegistryAccess(id);

    const full = await prisma.registry.findUnique({
      where: { id: registry.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        org: { select: { name: true } },
        policies: {
          orderBy: { createdAt: "desc" },
          select: {
            carrier: true,
            policyNumber: true,
            insuredName: true,
            beneficiary: true,
            faceAmount: true,
            status: true,
            notes: true,
          },
        },
      },
    });

    if (!full) {
      return NextResponse.json(
        { ok: false, message: "Registry not found." },
        { status: 404 }
      );
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const page = pdf.addPage([612, 792]); // US Letter
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawText = (text: string, size = 11, bold = false, xPos = 50) => {
      page.drawText(text, {
        x: xPos,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= size + 6;
    };

    drawText("HeirVault — Policy Registry Summary", 16, true);
    y -= 6;

    drawText(`Firm: ${full.org.name}`, 11, false);
    drawText(`Registry: ${full.name}`, 11, false);
    drawText(`Generated: ${new Date().toLocaleString()}`, 11, false);
    y -= 12;

    // Table headers
    const headers = ["Carrier", "Policy #", "Insured", "Beneficiary", "Status"];
    const cols = [120, 110, 110, 120, 80];
    let x = 50;

    headers.forEach((h, i) => {
      page.drawText(h, {
        x,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      x += cols[i];
    });

    y -= 16;

    const maxRows = 28;
    const rows = full.policies.slice(0, maxRows);

    for (const p of rows) {
      if (y < 80) break;
      x = 50;

      const cells = [
        p.carrier || "—",
        p.policyNumber || "—",
        p.insuredName || "—",
        p.beneficiary || "—",
        p.status || "unknown",
      ];

      cells.forEach((cell, i) => {
        page.drawText(trunc(cell, i === 0 ? 22 : i === 1 ? 18 : i === 2 ? 18 : i === 3 ? 20 : 10), {
          x,
          y,
          size: 9,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        x += cols[i];
      });

      y -= 14;
    }

    y -= 10;
    drawText("Notes:", 11, true);

    const notes = rows
      .map((p, i) => `${i + 1}. ${p.notes ? p.notes : ""}`.trim())
      .filter((s) => s.length > 2)
      .slice(0, 10);

    for (const line of notes) {
      if (y < 70) break;
      drawText(trunc(line, 90), 10, false);
    }

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HeirVault_Policy_Registry_Summary_${safe(full.name)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error in export route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}

function trunc(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function safe(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
}
