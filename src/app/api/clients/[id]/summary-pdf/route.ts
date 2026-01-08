import { NextRequest, NextResponse } from "next/server"

import { ClientRegistrySummaryPDF } from "@/pdfs/ClientRegistrySummary"
import { renderToStream } from "@react-pdf/renderer"
import { requireAttorneyOrOwner } from "@/lib/authz"
import { audit, AuditAction } from "@/lib/audit"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await requireAttorneyOrOwner();
  } catch (e: unknown) {
    const error = e as { message?: string, status?: number };
    return new NextResponse(error.message || "Unauthorized", {
      status: error.status || 401,
    });
  }

  const { user, org: orgContext, orgMember } = ctx;
  const { id } = await params;

  // Get client data using Supabase
  const { queryRaw } = await import("@/lib/db");
  type ClientData = { id: string; firstName: string; lastName: string; email: string; phone: string | null; dateOfBirth: Date | null; createdAt: Date };
  const clientDataResult = await queryRaw<Array<ClientData>>(`
    SELECT id, "firstName", "lastName", email, phone, "dateOfBirth", "createdAt"
    FROM clients
    WHERE id = $1
    LIMIT 1
  `, [id]);

  if (!clientDataResult || clientDataResult.length === 0) {
    return new NextResponse("Not found", { status: 404 })
  }

  const clientRow = (clientDataResult[0] as unknown) as ClientData;

  // Get policies with insurers and beneficiaries
  const policiesData = await queryRaw<Array<{
    id: string,
    policy_number: string | null;
    policy_type: string | null;
    insurer_id: string,
    insurer_name: string,
    insurer_contact_phone: string | null;
    insurer_contact_email: string | null;
  }>>(`
    SELECT 
      p.id,
      p.policy_number,
      p.policy_type,
      i.id as insurer_id,
      i.name as insurer_name,
      i.contact_phone as insurer_contact_phone,
      i.contact_email as insurer_contact_email
    FROM policies p
    INNER JOIN insurers i ON i.id = p.insurer_id
    WHERE p."clientId" = $1
    ORDER BY p."createdAt" DESC
  `, [id]);

  // Get beneficiaries for each policy
  type PolicyData = { id: string; policy_number: string | null; policy_type: string | null; insurer_id: string; insurer_name: string; insurer_contact_phone: string | null; insurer_contact_email: string | null };
  const policiesArray: PolicyData[] = (policiesData || []) as unknown as PolicyData[];
  const policyIds = policiesArray.map((p) => p.id);
  type PolicyBeneficiaryData = { policy_id: string; beneficiary_id: string; beneficiary_firstName: string; beneficiary_lastName: string; beneficiary_relationship: string | null };
  const policy_beneficiariesResult = policyIds.length > 0
    ? await queryRaw<Array<PolicyBeneficiaryData>>(`
        SELECT 
          pb.policy_id,
          b.id as beneficiary_id,
          b."firstName" as beneficiary_firstName,
          b."lastName" as beneficiary_lastName,
          b.relationship as beneficiary_relationship
        FROM policy_beneficiaries pb
        INNER JOIN beneficiaries b ON b.id = pb.beneficiary_id
        WHERE pb.policy_id = ANY($1::uuid[])
      `, [policyIds])
    : [];
  const policy_beneficiariesData = (policy_beneficiariesResult || []) as unknown as PolicyBeneficiaryData[];

  // Get all beneficiaries for the client
  const beneficiariesData = await queryRaw<Array<{
    id: string,
    firstName: string,
    lastName: string,
    relationship: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
  }>>(`
    SELECT id, "firstName", "lastName", relationship, email, phone, notes
    FROM beneficiaries
    WHERE "clientId" = $1
    ORDER BY "createdAt" DESC
  `, [id]);

  await audit({
    actorType: "ATTORNEY",
    actorId: user.id,
    clientId: id,
    action: AuditAction.CLIENT_SUMMARY_PDF_DOWNLOADED,
    metadata: {
      message: `Summary PDF downloaded for ${clientRow.firstName} ${clientRow.lastName}`,
      orgId: orgContext?.id || orgMember?.organizations?.id || null,
    },
  });

  // Map policies with their beneficiaries
  const policies = policiesArray.map((p) => ({
    id: p.id,
    insurer: {
      name: p.insurer_name,
      contactPhone: p.insurer_contact_phone,
      contactEmail: p.insurer_contact_email,
      website: null,
    },
    policyNumber: p.policy_number,
    policyType: p.policy_type,
    beneficiaries: policy_beneficiariesData
      .filter((pb) => pb.policy_id === p.id)
      .map((pb) => ({
        beneficiary: {
          firstName: pb.beneficiary_firstName,
          lastName: pb.beneficiary_lastName,
          relationship: pb.beneficiary_relationship || "",
          email: null,
          phone: null,
        },
        sharePercent: null,
      })),
  }));

  // Map beneficiaries
  type BeneficiaryData = { id: string; firstName: string; lastName: string; relationship: string | null; email: string | null; phone: string | null; notes: string | null };
  const beneficiariesArray: BeneficiaryData[] = (beneficiariesData || []) as unknown as BeneficiaryData[];
  const beneficiaries = beneficiariesArray.map((b) => ({
    id: b.id,
    firstName: b.firstName,
    lastName: b.lastName,
    relationship: b.relationship || "",
    email: b.email,
    phone: b.phone,
    notes: b.notes,
  }));

  const client = {
    firstName: clientRow.firstName,
    lastName: clientRow.lastName,
    email: clientRow.email,
    phone: clientRow.phone,
    dateOfBirth: clientRow.dateOfBirth,
    createdAt: clientRow.createdAt,
    policies,
    beneficiaries,
  };

  const pdfStream = await renderToStream(
    ClientRegistrySummaryPDF({
      client,
      firmName: orgContext?.name || orgMember?.organizations?.name || undefined,
      generatedAt: new Date(),
    }),
  )

  const headers = new Headers()
  headers.set("Content-Type", "application/pdf")
  headers.set(
    "Content-Disposition",
    `attachment; filename="heirvault-${client.lastName}-${client.firstName}.pdf"`,
  )

  return new NextResponse(pdfStream as unknown as BodyInit, {
    status: 200,
    headers,
  })
}

