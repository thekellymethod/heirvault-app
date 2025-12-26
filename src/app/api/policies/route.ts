import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuditAction } from "@/lib/db/enums";
import {
  getCurrentUserWithOrg,
  assertAttorneyCanAccessClient,
  assertClientSelfAccess,
} from "@/lib/authz";
import { audit } from "@/lib/audit";
import { sendPolicyAddedEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type CreatePolicyBody = {
  clientId: string;

  insurerName?: string | null;
  insurerPhone?: string | null;
  insurerEmail?: string | null;
  insurerWebsite?: string | null;

  insurerId?: string | null; // canonical insurer ID
  carrierNameRaw?: string | null; // raw carrier name from document/intake
  carrierConfidence?: number | string | null; // 0..1

  policyNumber?: string | null;
  policyType?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreatePolicyBody;

    const {
      clientId,
      insurerName,
      insurerPhone,
      insurerEmail,
      insurerWebsite,
      insurerId,
      carrierNameRaw,
      carrierConfidence,
      policyNumber,
      policyType,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Missing required field: clientId" }, { status: 400 });
    }

    const { user, orgMember } = await getCurrentUserWithOrg();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Your current business rule says "all authenticated users are attorneys"
    if (user.role === "attorney" || !user.role) {
      await assertAttorneyCanAccessClient(clientId);
    } else {
      await assertClientSelfAccess(clientId);
    }

    // Resolve insurerId vs carrierNameRaw
    let resolvedInsurerId: string | null = null;
    let resolvedCarrierNameRaw: string | null = null;

    if (insurerId) {
      resolvedInsurerId = insurerId;
    } else if (insurerName) {
      const existingInsurer = await prisma.insurers.findFirst({
        where: {
          // If you want case-insensitive matching:
          name: { equals: insurerName, mode: "insensitive" },
        },
      });

      if (existingInsurer) {
        resolvedInsurerId = existingInsurer.id;

        // Update insurer contact info if provided
        if (insurerPhone || insurerEmail || insurerWebsite) {
          await prisma.insurers.update({
            where: { id: existingInsurer.id },
            data: {
              contactPhone: insurerPhone ?? existingInsurer.contactPhone,
              contactEmail: insurerEmail ?? existingInsurer.contactEmail,
              website: insurerWebsite ?? existingInsurer.website,
              updatedAt: new Date(),
            },
          });
        }
      } else {
        // Lazy-insurer rule: don't auto-create; store raw name on policy
        resolvedCarrierNameRaw = insurerName;
      }
    } else if (carrierNameRaw) {
      resolvedCarrierNameRaw = carrierNameRaw;
    }

    if (!resolvedInsurerId && !resolvedCarrierNameRaw) {
      return NextResponse.json(
        {
          error:
            "Either insurerId, insurerName, or carrierNameRaw is required to identify the insurance carrier",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const policy = await prisma.policies.create({
      data: {
        id: randomUUID(),
        clientId,

        // ✅ Prisma model field names (camelCase)
        insurerId: resolvedInsurerId,                 // <-- was insurer_id
        carrierNameRaw: resolvedCarrierNameRaw,       // <-- was carrier_name_raw
        carrierConfidence:
          carrierConfidence === null || carrierConfidence === undefined || carrierConfidence === ""
            ? null
            : Number(carrierConfidence),

        policyNumber: policyNumber ?? null,           // <-- was policy_number
        policyType: policyType ?? null,               // <-- was policy_type

        createdAt: now,
        updatedAt: now,                               // <-- was updated_at
      },
      include: {
        insurers: true,
      },
    });

    const insurerDisplayName =
      policy.insurers?.name ??
      resolvedCarrierNameRaw ??
      "Unknown";

    await audit(AuditAction.POLICY_CREATED, {
      clientId: policy.clientId,
      policyId: policy.id,
      message: `Policy created for client ${policy.clientId} with insurer ${insurerDisplayName}${
        resolvedCarrierNameRaw ? " (unresolved)" : ""
      }`,
      userId: user.id,
    });

    // Email notification to client (best-effort)
    try {
      const client = await prisma.clients.findFirst({ where: { id: clientId } });
      if (client?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const dashboardUrl = `${baseUrl}/dashboard/clients/${clientId}`;
        const firmName = orgMember?.organizations?.name || undefined;

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.firstName} ${client.lastName}`.trim(),
          insurerName: insurerDisplayName,
          policyNumber: policyNumber ?? undefined,
          policyType: policyType ?? undefined,
          firmName,
          dashboardUrl,
        }).catch((emailError) => {
          console.error("Error sending policy added email:", emailError);
        });
      }
    } catch (emailError) {
      console.error("Error sending policy added email:", emailError);
    }

    return NextResponse.json(policy, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId required" }, { status: 400 });
    }

    const { user } = await getCurrentUserWithOrg();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role === "attorney" || !user.role) {
      await assertAttorneyCanAccessClient(clientId);
    } else {
      await assertClientSelfAccess(clientId);
    }

    const policiesList = await prisma.policies.findMany({
      where: { clientId },
      include: { insurers: true },
      orderBy: { createdAt: "desc" },
    });

    const policyIds = policiesList.map((p) => p.id);

    const policyBeneficiaryData =
      policyIds.length > 0
        ? await prisma.policy_beneficiaries.findMany({
            where: { policyId: { in: policyIds } }, // <-- was policy_id
            include: { beneficiaries: true },
          })
        : [];

    const policiesWithRelations = policiesList.map((p) => ({
      ...p,
      insurer: p.insurers,
      beneficiaries: policyBeneficiaryData
        .filter((pb) => pb.policyId === p.id) // <-- was policy_id
        .map((pb) => ({ beneficiary: pb.beneficiaries })),
    }));

    await audit(AuditAction.CLIENT_VIEWED, {
      clientId,
      message: `Policy list viewed for client ${clientId}`,
      userId: user.id,
    });

    return NextResponse.json(policiesWithRelations);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    );
  }
}
