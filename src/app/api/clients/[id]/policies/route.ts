import { NextRequest, NextResponse } from "next/server";
import { db, clients, policies, beneficiaries, insurers, policyBeneficiaries, eq, inArray, desc } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";
import { sendPolicyAddedEmail } from "@/lib/email";
import { getCurrentUserWithOrg } from "@/lib/authz";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    const { id: clientId } = await ctx.params;

    // Check if client exists
    const [clientExists] = await db.select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get policies with insurers (left join to include policies without insurers)
    const clientPolicies = await db.select({
      policy: policies,
      insurer: insurers,
    })
      .from(policies)
      .leftJoin(insurers, eq(policies.insurerId, insurers.id))
      .where(eq(policies.clientId, clientId))
      .orderBy(desc(policies.createdAt));

    // Get policy beneficiaries for all policies
    const policyIds = clientPolicies.map(p => p.policy.id);
    const policyBeneficiaryData = policyIds.length > 0
      ? await db.select({
          policyId: policyBeneficiaries.policyId,
          beneficiary: beneficiaries,
        })
          .from(policyBeneficiaries)
          .innerJoin(beneficiaries, eq(policyBeneficiaries.beneficiaryId, beneficiaries.id))
          .where(inArray(policyBeneficiaries.policyId, policyIds))
      : [];

    // Combine policy beneficiaries with policies
    const policiesWithBeneficiaries = clientPolicies.map(p => ({
      ...p.policy,
      insurer: p.insurer,
      beneficiaries: policyBeneficiaryData
        .filter(pb => pb.policyId === p.policy.id)
        .map(pb => pb.beneficiary),
    }));

    return NextResponse.json({ policies: policiesWithBeneficiaries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    const { id: clientId } = await ctx.params;

    // Verify client exists
    const [clientExists] = await db.select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

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

    const [policy] = await db.insert(policies)
      .values({
        clientId,
        insurerId: insurerId || null,
        carrierNameRaw: carrierNameRaw || null,
        carrierConfidence: carrierConfidence ? Number(carrierConfidence) : null,
        policyNumber,
        policyType,
      })
      .returning({
        id: policies.id,
        clientId: policies.clientId,
        insurerId: policies.insurerId,
        carrierNameRaw: policies.carrierNameRaw,
        carrierConfidence: policies.carrierConfidence,
        policyNumber: policies.policyNumber,
        policyType: policies.policyType,
        createdAt: policies.createdAt,
      });

    // Get insurer info if insurerId was provided
    const insurer = insurerId
      ? (await db.select()
          .from(insurers)
          .where(eq(insurers.id, insurerId))
          .limit(1))[0] || null
      : null;

    // Send email notification to client (if email exists)
    try {
      const [client] = await db.select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (client && client.email) {
        const { orgMember } = await getCurrentUserWithOrg();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        const dashboardUrl = `${baseUrl}/dashboard/clients/${clientId}`;
        const firmName = orgMember?.organizations?.name || undefined;
        const insurerName = insurer?.name || policy.carrierNameRaw || "Unknown";

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.firstName} ${client.lastName}`,
          insurerName,
          policyNumber: policy.policyNumber || undefined,
          policyType: policy.policyType || undefined,
          firmName,
          dashboardUrl,
        }).catch((emailError) => {
          console.error("Error sending policy added email:", emailError);
          // Don't fail the request if email fails
        });
      }
    } catch (emailError) {
      console.error("Error sending policy added email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      policy: {
        ...policy,
        insurer: insurer ? { id: insurer.id, name: insurer.name } : null,
        carrierNameRaw: policy.carrierNameRaw,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
