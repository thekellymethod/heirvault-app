import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuditAction } from '@/lib/db/enums'
import { getCurrentUserWithOrg, assertAttorneyCanAccessClient, assertClientSelfAccess } from '@/lib/authz'
import { audit } from '@/lib/audit'
import { sendPolicyAddedEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      clientId,
      insurerName,
      insurerPhone,
      insurerEmail,
      insurerWebsite,
      insurerId, // Optional: if canonical insurer ID is known
      carrierNameRaw, // Optional: raw carrier name from document/intake
      carrierConfidence, // Optional: OCR/LLM confidence (0..1)
      policyNumber,
      policyType,
    } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      )
    }

    // Check access - can be attorney or client
    const { user } = await getCurrentUserWithOrg()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // All authenticated users are attorneys and have global access to all clients
    // Clients don't have accounts - they access via invitation tokens
    if (user.role === 'attorney' || !user.role) {
      await assertAttorneyCanAccessClient(clientId)
    } else {
      // This branch should rarely/never execute since clients don't have accounts
      await assertClientSelfAccess(clientId)
    }

    // Determine insurer_id and carrier_name_raw
    let resolvedInsurerId: string | null = null;
    let resolvedCarrierNameRaw: string | null = null;

    // If insurerId is provided, use it (canonical insurer already known)
    if (insurerId) {
      resolvedInsurerId = insurerId;
    } else if (insurerName) {
      // Try to find or create insurer
      const existingInsurer = await prisma.insurers.findFirst({
        where: { name: insurerName },
      });

      if (existingInsurer) {
        resolvedInsurerId = existingInsurer.id;
        // Update existing insurer if new contact info provided
        if (insurerPhone || insurerEmail || insurerWebsite) {
          await prisma.insurers.update({
            where: { id: existingInsurer.id },
            data: {
              contact_phone: insurerPhone || existingInsurer.contact_phone,
              contact_email: insurerEmail || existingInsurer.contact_email,
              website: insurerWebsite || existingInsurer.website,
              updated_at: new Date(),
            },
          });
        }
      } else {
        // Insurer not found - store raw name instead of creating
        // (lazy insurers: don't auto-create during intake)
        resolvedCarrierNameRaw = insurerName;
      }
    } else if (carrierNameRaw) {
      // Raw carrier name provided directly
      resolvedCarrierNameRaw = carrierNameRaw;
    }

    // Validate that at least one form of insurer identification is provided
    // This prevents creating orphaned policies with no way to identify the insurance carrier
    if (!resolvedInsurerId && !resolvedCarrierNameRaw) {
      return NextResponse.json(
        { error: 'Either insurerId, insurerName, or carrierNameRaw is required to identify the insurance carrier' },
        { status: 400 }
      );
    }

    // Create policy
    const policyId = randomUUID();
    const now = new Date();
    const policy = await prisma.policies.create({
      data: {
        id: policyId,
        client_id: clientId,
        insurer_id: resolvedInsurerId,
        carrier_name_raw: resolvedCarrierNameRaw,
        carrier_confidence: carrierConfidence ? Number(carrierConfidence) : null,
        policy_number: policyNumber || null,
        policy_type: policyType || null,
        created_at: now,
        updated_at: now,
      },
    });

    const insurerDisplayName = resolvedInsurerId 
      ? (await prisma.insurers.findFirst({ where: { id: resolvedInsurerId } }))?.name || 'Unknown'
      : resolvedCarrierNameRaw || 'Unknown';
    
    await audit(AuditAction.POLICY_CREATED, {
      clientId: policy.client_id,
      policyId: policy.id,
      message: `Policy created for client ${policy.client_id} with insurer ${insurerDisplayName}${resolvedCarrierNameRaw ? ' (unresolved)' : ''}`,
    })

    // Send email notification to client (if email exists)
    try {
      const client = await prisma.clients.findFirst({
        where: { id: clientId },
      });

      if (client && client.email) {
        const { orgMember } = await getCurrentUserWithOrg();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const dashboardUrl = `${baseUrl}/dashboard/clients/${clientId}`;
        const firmName = orgMember?.organizations?.name || undefined;

        const emailInsurerName = resolvedInsurerId
          ? (await prisma.insurers.findFirst({ where: { id: resolvedInsurerId } }))?.name || 'Unknown'
          : resolvedCarrierNameRaw || 'Unknown';

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.first_name} ${client.last_name}`,
          insurerName: emailInsurerName,
          policyNumber: policyNumber || undefined,
          policyType: policyType || undefined,
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

    return NextResponse.json(policy, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' || message === 'Forbidden' ? 401 : 400 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId required' },
        { status: 400 }
      )
    }

    // Check access - can be attorney or client
    const { user } = await getCurrentUserWithOrg()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // All authenticated users are attorneys and have global access to all clients
    // Clients don't have accounts - they access via invitation tokens
    if (user.role === 'attorney' || !user.role) {
      await assertAttorneyCanAccessClient(clientId)
    } else {
      // This branch should rarely/never execute since clients don't have accounts
      await assertClientSelfAccess(clientId)
    }

    // Get policies with insurers (left join to include policies without insurers)
    const policiesList = await prisma.policies.findMany({
      where: { client_id: clientId },
      include: {
        insurers: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Get policy beneficiaries
    const policyIds = policiesList.map(p => p.id);
    const policyBeneficiaryData = policyIds.length > 0
      ? await prisma.policy_beneficiaries.findMany({
          where: { policy_id: { in: policyIds } },
          include: {
            beneficiaries: true,
          },
        })
      : [];

    // Combine policies with beneficiaries
    const policiesWithRelations = policiesList.map(p => ({
      ...p,
      insurer: p.insurers,
      beneficiaries: policyBeneficiaryData
        .filter(pb => pb.policy_id === p.id)
        .map(pb => ({ beneficiary: pb.beneficiaries })),
    }));

    // Audit logging for policy list view
    // Note: Using audit() function for consistency
    await audit(AuditAction.CLIENT_VIEWED, {
      clientId,
      message: `Policy list viewed for client ${clientId}`,
      userId: user.id,
    })

    return NextResponse.json(policiesWithRelations)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' || message === 'Forbidden' ? 401 : 400 }
    )
  }
}

