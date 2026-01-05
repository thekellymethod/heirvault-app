import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { PolicyRegistrySummaryPDF, PolicyRegistrySummaryInput } from "@/pdfs/PolicyRegistrySummaryPDF";

export const dynamic = "force-dynamic";

export async function GET() {
  // Sample data matching the PDF spec
  const sampleInput: PolicyRegistrySummaryInput = {
    estateName: "Sample Estate of J. Doe",
    preparedFor: "Sample Firm, PLLC",
    generatedISO: new Date("2026-01-03").toISOString(),
    lastActivityLabel: "March 15, 2026",
    watermark: true,
    policies: [
      {
        carrier: "Prudential",
        policyNumberMasked: "***-4821",
        insured: "John R. Doe",
        beneficiaries: "Jane Doe",
        status: "Verified",
        hasDocuments: true,
        notes: "Policy copy received",
      },
      {
        carrier: "MetLife",
        policyNumberMasked: "***-1137",
        insured: "John R. Doe",
        beneficiaries: "Family Trust",
        status: "Requested",
        hasDocuments: false,
        notes: "Awaiting carrier response",
      },
      {
        carrier: "Unknown",
        policyNumberMasked: "—",
        insured: "John R. Doe",
        beneficiaries: "Unknown",
        status: "Unknown",
        hasDocuments: false,
        notes: "Possible employer policy with incomplete details",
      },
    ],
  };

  try {
    const pdfStream = await renderToStream(
      PolicyRegistrySummaryPDF({ input: sampleInput })
    );

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      'inline; filename="HeirVault_Policy_Registry_Summary_SAMPLE-REDACTED.pdf"'
    );
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(pdfStream as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error generating sample PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate sample PDF" },
      { status: 500 }
    );
  }
}
