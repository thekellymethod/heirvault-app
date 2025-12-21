import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ProbateSummaryPDF } from "@/pdfs/ProbateSummaryPDF";
import { renderToStream } from "@react-pdf/renderer";
import { requireAttorneyOrOwner } from "@/lib/authz";
import { audit, AuditAction } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await requireAttorneyOrOwner();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return new NextResponse(error.message || "Unauthorized", {
      status: error.status || 401,
    });
  }

  const { user, orgMember } = ctx;
  const { id } = await params;

  // Get query parameters for optional probate-specific fields
  const { searchParams } = new URL(req.url);
  const executorName = searchParams.get("executorName") || undefined;
  const executorContact = searchParams.get("executorContact") || undefined;
  const caseNumber = searchParams.get("caseNumber") || undefined;

  // Get client data using raw SQL
  const clientData = await prisma.$queryRawUnsafe<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    date_of_birth: Date | null;
    created_at: Date;
  }>>(`
    SELECT id, first_name, last_name, email, phone, date_of_birth, created_at
    FROM clients
    WHERE id = $1
    LIMIT 1
  `, id);

  if (!clientData || clientData.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const client = clientData[0];

  // Get policies with insurers and beneficiaries
  const policiesData = await prisma.$queryRawUnsafe<Array<{
    id: string;
    policy_number: string | null;
    policy_type: string | null;
    verification_status: string;
    insurer_id: string;
    insurer_name: string;
    insurer_contact_phone: string | null;
    insurer_contact_email: string | null;
  }>>(`
    SELECT 
      p.id,
      p.policy_number,
      p.policy_type,
      p.verification_status,
      i.id as insurer_id,
      i.name as insurer_name,
      i.contact_phone as insurer_contact_phone,
      i.contact_email as insurer_contact_email
    FROM policies p
    INNER JOIN insurers i ON i.id = p.insurer_id
    WHERE p.client_id = $1
    ORDER BY p.created_at DESC
  `, id);

  // Get beneficiaries for each policy
  const policyIds = policiesData.map((p) => p.id);
  const policyBeneficiariesData = policyIds.length > 0
    ? await prisma.$queryRawUnsafe<Array<{
        policy_id: string;
        beneficiary_id: string;
        beneficiary_first_name: string;
        beneficiary_last_name: string;
        beneficiary_relationship: string | null;
        beneficiary_email: string | null;
        beneficiary_phone: string | null;
      }>>(`
        SELECT 
          pb.policy_id,
          b.id as beneficiary_id,
          b.first_name as beneficiary_first_name,
          b.last_name as beneficiary_last_name,
          b.relationship as beneficiary_relationship,
          b.email as beneficiary_email,
          b.phone as beneficiary_phone
        FROM policy_beneficiaries pb
        INNER JOIN beneficiaries b ON b.id = pb.beneficiary_id
        WHERE pb.policy_id = ANY($1::uuid[])
      `, policyIds)
    : [];

  // Get all beneficiaries for the client
  const beneficiariesData = await prisma.$queryRawUnsafe<Array<{
    id: string;
    first_name: string;
    last_name: string;
    relationship: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: Date | null;
  }>>(`
    SELECT id, first_name, last_name, relationship, email, phone, date_of_birth
    FROM beneficiaries
    WHERE client_id = $1
    ORDER BY created_at DESC
  `, id);

  // Log the PDF download
  await audit(AuditAction.CLIENT_SUMMARY_PDF_DOWNLOADED, {
    clientId: id,
    message: `Probate summary PDF downloaded for ${client.first_name} ${client.last_name}`,
    userId: user.id,
    orgId: orgMember?.organizations?.id || orgMember?.organizationId || null,
  });

  // Map policies with their beneficiaries
  const policies = policiesData.map((p) => ({
    id: p.id,
    insurer: {
      name: p.insurer_name,
      contactPhone: p.insurer_contact_phone,
      contactEmail: p.insurer_contact_email,
    },
    policyNumber: p.policy_number,
    policyType: p.policy_type,
    verificationStatus: p.verification_status,
    beneficiaries: policyBeneficiariesData
      .filter((pb) => pb.policy_id === p.id)
      .map((pb) => ({
        beneficiary: {
          firstName: pb.beneficiary_first_name,
          lastName: pb.beneficiary_last_name,
          relationship: pb.beneficiary_relationship,
          email: pb.beneficiary_email,
          phone: pb.beneficiary_phone,
        },
        sharePercent: null,
      })),
  }));

  // Map beneficiaries
  const beneficiaries = beneficiariesData.map((b) => ({
    id: b.id,
    firstName: b.first_name,
    lastName: b.last_name,
    relationship: b.relationship,
    email: b.email,
    phone: b.phone,
    dateOfBirth: b.date_of_birth,
  }));

  const pdfStream = await renderToStream(
    ProbateSummaryPDF({
      client: {
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone,
        dateOfBirth: client.date_of_birth,
        createdAt: client.created_at,
      },
      policies,
      beneficiaries,
      firmName: orgMember?.organizations?.name,
      generatedAt: new Date(),
      executorName,
      executorContact,
      caseNumber,
    })
  );

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    `attachment; filename="probate-summary-${client.last_name}-${client.first_name}.pdf"`
  );

  return new NextResponse(pdfStream as unknown as BodyInit, {
    status: 200,
    headers,
  });
}
