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
      policyNumber,
      policyType,
    } = body

    if (!clientId || !insurerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Find or create insurer
    const [existingInsurer] = await db.select()
      .from(insurers)
      .where(eq(insurers.name, insurerName))
      .limit(1);

    let insurer;
    if (!existingInsurer) {
      const [newInsurer] = await db.insert(insurers)
        .values({
          name: insurerName,
          contactPhone: insurerPhone || null,
          contactEmail: insurerEmail || null,
          website: insurerWebsite || null,
        })
        .returning();
      insurer = newInsurer;
    } else {
      // Update existing insurer if new contact info provided
      if (insurerPhone || insurerEmail || insurerWebsite) {
        const [updated] = await db.update(insurers)
          .set({
            contactPhone: insurerPhone || existingInsurer.contactPhone,
            contactEmail: insurerEmail || existingInsurer.contactEmail,
            website: insurerWebsite || existingInsurer.website,
            updatedAt: new Date(),
          })
          .where(eq(insurers.id, existingInsurer.id))
          .returning();
        insurer = updated || existingInsurer;
      } else {
        insurer = existingInsurer;
      }
    }

    // Create policy
    const [policy] = await db.insert(policies)
      .values({
        clientId,
        insurerId: insurer.id,
        policyNumber: policyNumber || null,
        policyType: policyType || null,
      })
      .returning();

    await audit(AuditAction.POLICY_CREATED, {
      clientId: policy.clientId,
      policyId: policy.id,
      message: `Policy created for client ${policy.clientId} with insurer ${insurer.name}`,
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

        await sendPolicyAddedEmail({
          to: client.email,
          clientName: `${client.firstName} ${client.lastName}`,
          insurerName: insurer.name,
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

    // Get policies with insurers
    const policiesList = await db.select({
      policy: policies,
      insurer: insurers,
    })
      .from(policies)
      .innerJoin(insurers, eq(policies.insurerId, insurers.id))
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

