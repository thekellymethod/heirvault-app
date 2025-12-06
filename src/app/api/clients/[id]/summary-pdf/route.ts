import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ClientRegistrySummaryPDF } from "@/pdfs/ClientRegistrySummary"
import { renderToStream } from "@react-pdf/renderer"
import { requireAttorneyOrOwner } from "@/lib/authz"
import { audit } from "@/lib/audit"
import { AuditAction } from "@prisma/client"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await requireAttorneyOrOwner();
  } catch (e: any) {
    return new NextResponse(e.message || "Unauthorized", {
      status: e.status || 401,
    });
  }

  const { user, orgMember } = ctx;
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      policies: {
        include: {
          insurer: true,
          beneficiaries: {
            include: {
              beneficiary: true,
            },
          },
        },
      },
      beneficiaries: true,
    },
  })

  if (!client) {
    return new NextResponse("Not found", { status: 404 })
  }

  await audit(AuditAction.CLIENT_SUMMARY_PDF_DOWNLOADED, {
    clientId: client.id,
    message: `Summary PDF downloaded for ${client.firstName} ${client.lastName}`,
  });

  const pdfStream = await renderToStream(
    ClientRegistrySummaryPDF({
      client: {
        ...client,
        dateOfBirth: client.dateOfBirth,
        createdAt: client.createdAt,
      },
      firmName: orgMember?.organization.name,
      generatedAt: new Date(),
    }),
  )

  const headers = new Headers()
  headers.set("Content-Type", "application/pdf")
  headers.set(
    "Content-Disposition",
    `attachment; filename="heirregistry-${client.lastName}-${client.firstName}.pdf"`,
  )

  return new NextResponse(pdfStream as any, {
    status: 200,
    headers,
  })
}

