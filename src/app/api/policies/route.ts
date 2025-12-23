import { NextRequest, NextResponse } from 'next/server'
import { db, insurers, policies, beneficiaries, policyBeneficiaries, clients, eq, desc, inArray, AuditAction } from '@/lib/db'
import { getCurrentUserWithOrg, assertAttorneyCanAccessClient, assertClientSelfAccess } from '@/lib/authz'
import { audit } from '@/lib/audit'
import { sendPolicyAddedEmail } from '@/lib/email'

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
      const [existingInsurer] = await db.select()
        .from(insurers)
        .where(eq(insurers.name, insurerName))
        .limit(1);

      if (existingInsurer) {
        resolvedInsurerId = existingInsurer.id;
        // Update existing insurer if new contact info provided
        if (insurerPhone || insurerEmail || insurerWebsite) {
          await db.update(insurers)
            .set({
              contactPhone: insurerPhone || existingInsurer.contactPhone,
              contactEmail: insurerEmail || existingInsurer.contactEmail,
              website: insurerWebsite || existingInsurer.website,
              updatedAt: new Date(),
            })
            .where(eq(insurers.id, existingInsurer.id));
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
    const [policy] = await db.insert(policies)
      .values({
        clientId,
        insurerId: resolvedInsurerId,
        carrierNameRaw: resolvedCarrierNameRaw,
        carrierConfidence: carrierConfidence ? Number(carrierConfidence) : null,
        policyNumber: policyNumber || null,
        policyType: policyType || null,
      })
      .returning();

    const insurerDisplayName = resolvedInsurerId 
      ? (await db.select().from(insurers).where(eq(insurers.id, resolvedInsurerId)).limit(1))[0]?.name || 'Unknown'
      : resolvedCarrierNameRaw || 'Unknown';
    
    await audit(AuditAction.POLICY_CREATED, {
      clientId: policy.clientId,
      policyId: policy.id,
      message: `Policy created for client ${policy.clientId} with insurer ${insurerDisplayName}${resolvedCarrierNameRaw ? ' (unresolved)' : ''}`,
    })

    // Send email notification to client (if email exists)
    try {
      const [client] = await db.select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (client && client.email) {
        const { orgMember } = await getCurrentUserWithOrg();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const dashboardUrl = `${baseUrl}/dashboard/clients/${clientId}`;
        const firmName = orgMember?.organizations?.name || undefined;

        const emailInsurerName = resolvedInsurerId
          ? (await db.select().from(insurers).where(eq(insurers.id, resolvedInsurerId)).limit(1))[0]?.name || 'Unknown'
          : resolvedCarrierNameRaw || 'Unknown';

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.firstName} ${client.lastName}`,
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
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
    const policiesList = await db.select({
      policy: policies,
      insurer: insurers,
    })
      .from(policies)
      .leftJoin(insurers, eq(policies.insurerId, insurers.id))
      .where(eq(policies.clientId, clientId))
      .orderBy(desc(policies.createdAt));

    // Get policy beneficiaries
    const policyIds = policiesList.map(p => p.policy.id);
    const policyBeneficiaryData = policyIds.length > 0
      ? await db.select({
          policyId: policyBeneficiaries.policyId,
          beneficiary: beneficiaries,
        })
          .from(policyBeneficiaries)
          .innerJoin(beneficiaries, eq(policyBeneficiaries.beneficiaryId, beneficiaries.id))
          .where(inArray(policyBeneficiaries.policyId, policyIds))
      : [];

    // Combine policies with beneficiaries
    const policiesWithRelations = policiesList.map(p => ({
      ...p.policy,
      insurer: p.insurer,
      beneficiaries: policyBeneficiaryData
        .filter(pb => pb.policyId === p.policy.id)
        .map(pb => ({ beneficiary: pb.beneficiary })),
    }));

    // Audit logging for policy list view
    // Note: Using audit() function for consistency
    await audit(AuditAction.CLIENT_VIEWED, {
      clientId,
      message: `Policy list viewed for client ${clientId}`,
      userId: user.id,
    })

    return NextResponse.json(policiesWithRelations)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

