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

    // Get policies with insurers
    const clientPolicies = await db.select({
      policy: policies,
      insurer: insurers,
    })
      .from(policies)
      .innerJoin(insurers, eq(policies.insurerId, insurers.id))
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
    const policyNumber = (body?.policyNumber as string | undefined) ?? null;
    const policyType = (body?.policyType as string | undefined) ?? null;

    if (!insurerId) {
      return NextResponse.json({ error: "insurerId is required" }, { status: 400 });
    }

    const [policy] = await db.insert(policies)
      .values({
        clientId,
        insurerId,
        policyNumber,
        policyType,
      })
      .returning({
        id: policies.id,
        clientId: policies.clientId,
        insurerId: policies.insurerId,
        policyNumber: policies.policyNumber,
        policyType: policies.policyType,
        createdAt: policies.createdAt,
      });

    // Get insurer info
    const [insurer] = await db.select()
      .from(insurers)
      .where(eq(insurers.id, insurerId))
      .limit(1);

    // Send email notification to client (if email exists)
    try {
      const [client] = await db.select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (client && client.email && insurer) {
        const { orgMember } = await getCurrentUserWithOrg();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        const dashboardUrl = `${baseUrl}/dashboard/clients/${clientId}`;
        const firmName = orgMember?.organizations?.name || undefined;

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.firstName} ${client.lastName}`,
          insurerName: insurer.name,
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
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
