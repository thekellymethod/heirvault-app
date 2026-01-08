import { NextRequest, NextResponse } from "next/server";
;
import { requireAuthApi } from "@/lib/utils/clerk";
import { sendPolicyAddedEmail } from "@/lib/email";
import { getCurrentUserWithOrg } from "@/lib/authz";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user: _user } = authResult;

  try {
    const { id: clientId } = await ctx.params;

    const { findUnique: findUniqueClient, findMany: findManyPolicies, findMany: findManyPolicyBeneficiaries, findMany: findManyBeneficiaries, findMany: findManyInsurers } = await import("@/lib/db");
    
    // Check if client exists
    const clientExists = await findUniqueClient("clients", { id: clientId });

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get policies
    const clientPolicies = await findManyPolicies("policies", {
      where: { clientId: clientId },
      orderBy: { column: "createdAt", ascending: false },
    });

    // Get insurers for policies
    const policyIds = (clientPolicies || []).map((p: any) => p.id);
    const insurers = policyIds.length > 0 
      ? await findManyInsurers("insurers", {
          where: { id: { in: policyIds.map((p: any) => (clientPolicies as any[]).find((cp: any) => cp.id === p)?.insurerId).filter(Boolean) } },
        })
      : [];

    // Get policy beneficiaries for all policies
    const policyBeneficiaryData = policyIds.length > 0
      ? await findManyPolicyBeneficiaries("policy_beneficiaries", {
          where: { policyId: { in: policyIds } },
        })
      : [];

    // Get beneficiaries
    const beneficiaryIds = (policyBeneficiaryData || []).map((pb: any) => pb.beneficiaryId).filter(Boolean);
    const beneficiaries = beneficiaryIds.length > 0
      ? await findManyBeneficiaries("beneficiaries", {
          where: { id: { in: beneficiaryIds } },
        })
      : [];

    // Combine policy beneficiaries with policies
    const policiesWithBeneficiaries = (clientPolicies || []).map((p: any) => {
      const insurer = insurers && insurers.length > 0 
        ? (insurers as any[]).find((i: any) => i.id === p.insurerId)
        : null;
      const policyBeneficiaries = (policyBeneficiaryData || []).filter((pb: any) => pb.policyId === p.id);
      const policyBeneficiaryList = policyBeneficiaries.map((pb: any) => {
        const beneficiary = (beneficiaries || []).find((b: any) => b.id === pb.beneficiaryId);
        return beneficiary;
      }).filter(Boolean);
      
      return {
        ...p,
        insurer: insurer || null,
        beneficiaries: policyBeneficiaryList,
      };
    });

    return NextResponse.json({ policies: policiesWithBeneficiaries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user: _user } = authResult;

  try {
    const { id: clientId } = await ctx.params;

    const { findUnique: findUniqueClient, create: createPolicy, findUnique: findUniqueInsurer } = await import("@/lib/db");
    
    // Verify client exists
    const clientExists = await findUniqueClient("clients", { id: clientId });

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const insurerId = body?.insurerId as string | undefined;
    const carrierNameRaw = body?.carrierNameRaw as string | undefined;
    const carrierConfidence = body?.carrierConfidence as number | undefined;
    const policyNumber = (body?.policyNumber as string | undefined) ?? null;
    const policyType = (body?.policyType as string | undefined) ?? null;

    // Either insurerId or carrierNameRaw must be provided
    if (!insurerId && !carrierNameRaw) {
      return NextResponse.json({ error: "Either insurerId or carrierNameRaw is required" }, { status: 400 });
    }

    const policyId = randomUUID();
    const now = new Date().toISOString();
    type PolicyRecord = { id: string; carrierNameRaw: string | null; policyNumber: string | null; policyType: string | null };
    const policyResult = await createPolicy<PolicyRecord>("policies", {
      id: policyId,
      clientId: clientId,
      insurerId: insurerId || null,
      carrierNameRaw: carrierNameRaw || null,
      carrierConfidence: carrierConfidence ? Number(carrierConfidence) : null,
      policyNumber: policyNumber,
      policyType: policyType,
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);

    // Get insurer info if insurerId was provided
    const insurer = insurerId
      ? await findUniqueInsurer("insurers", { id: insurerId })
      : null;

    // Send email notification to client (if email exists)
    const policyRecord = policyResult as PolicyRecord;
    try {
      type ClientRecord = { id: string; email: string; firstName: string; lastName: string };
      const client = await findUniqueClient<ClientRecord>("clients", { id: clientId });

      if (client && client.email) {
        const { org } = await getCurrentUserWithOrg();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        const dashboardUrl = `${baseUrl}/dashboard/clients/${clientId}`;
        const firmName = org?.name || undefined;
        type InsurerRecord = { id: string; name: string };
        const insurerName = (insurer as InsurerRecord | null)?.name || policyRecord.carrierNameRaw || "Unknown";

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.firstName} ${client.lastName}`,
          insurerName,
          policyNumber: policyRecord.policyNumber || undefined,
          policyType: policyRecord.policyType || undefined,
          firmName,
          dashboardUrl,
        }).catch((emailError: unknown) => {
          console.error("Error sending policy added email:", emailError);
          // Don't fail the request if email fails
        });
      }
    } catch (emailError: unknown) {
      console.error("Error sending policy added email:", emailError);
      // Don't fail the request if email fails
    }

    type InsurerRecord = { id: string; name: string };
    return NextResponse.json({
      policy: {
        ...policyResult,
        insurer: insurer ? { id: (insurer as InsurerRecord).id, name: (insurer as InsurerRecord).name } : null,
        carrierNameRaw: policyRecord?.carrierNameRaw || null,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
