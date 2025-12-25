import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";
import { sendPolicyAddedEmail } from "@/lib/email";
import { getCurrentUserWithOrg } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    const { id: clientId } = await ctx.params;

    // Check if client exists
    const clientExists = await prisma.clients.findFirst({
      where: { id: clientId },
      select: { id: true },
    });

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get policies with insurers (left join to include policies without insurers)
    const clientPolicies = await prisma.policies.findMany({
      where: { client_id: clientId },
      include: {
        insurers: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Get policy beneficiaries for all policies
    const policyIds = clientPolicies.map(p => p.id);
    const policyBeneficiaryData = policyIds.length > 0
      ? await prisma.policy_beneficiaries.findMany({
          where: { policy_id: { in: policyIds } },
          include: {
            beneficiaries: true,
          },
        })
      : [];

    // Combine policy beneficiaries with policies
    const policiesWithBeneficiaries = clientPolicies.map(p => ({
      ...p,
      insurer: p.insurers,
      beneficiaries: policyBeneficiaryData
        .filter(pb => pb.policy_id === p.id)
        .map(pb => pb.beneficiaries),
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
    const clientExists = await prisma.clients.findFirst({
      where: { id: clientId },
      select: { id: true },
    });

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
    const now = new Date();
    const policy = await prisma.policies.create({
      data: {
        id: policyId,
        client_id: clientId,
        insurer_id: insurerId || null,
        carrier_name_raw: carrierNameRaw || null,
        carrier_confidence: carrierConfidence ? Number(carrierConfidence) : null,
        policy_number: policyNumber,
        policy_type: policyType,
        created_at: now,
        updated_at: now,
      },
    });

    // Get insurer info if insurerId was provided
    const insurer = insurerId
      ? await prisma.insurers.findFirst({ where: { id: insurerId } })
      : null;

    // Send email notification to client (if email exists)
    try {
      const client = await prisma.clients.findFirst({
        where: { id: clientId },
      });

      if (client && client.email) {
        const { orgMember } = await getCurrentUserWithOrg();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
        const dashboardUrl = `${baseUrl}/dashboard/clients/${clientId}`;
        const firmName = orgMember?.organizations?.name || undefined;
        const insurerName = insurer?.name || policy.carrier_name_raw || "Unknown";

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.first_name} ${client.last_name}`,
          insurerName,
          policyNumber: policy.policy_number || undefined,
          policyType: policy.policy_type || undefined,
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
        carrierNameRaw: policy.carrier_name_raw,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
