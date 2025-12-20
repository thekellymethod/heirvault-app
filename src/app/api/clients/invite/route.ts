import { NextRequest, NextResponse } from 'next/server'
import { db, clients, attorneyClientAccess, clientInvites, eq } from '@/lib/db'
import { requireAuthApi } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'
import { sendClientInviteEmail } from '@/lib/email'
import { getCurrentUserWithOrg } from '@/lib/authz'
import { generateClientFingerprint, findClientByFingerprint } from '@/lib/client-fingerprint'
import { randomBytes, randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    const body = await req.json().catch(() => ({}))
    
    const {
      email,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      sendInvite = true,
    } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Get user's organization
    const { orgMember } = await getCurrentUserWithOrg()
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Organization not found. Please ensure you have an organization set up.' },
        { status: 404 }
      )
    }

    // Get organization ID from orgMember
    const organizationId = (orgMember as any).organizationId || orgMember.organizations?.id
    const organizationName = orgMember.organizations?.name || 'Your Firm'
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID not found' },
        { status: 404 }
      )
    }

    // Check if client already exists
    const [existingClient] = await db.select()
      .from(clients)
      .where(eq(clients.email, email))
      .limit(1);
    
    let client = existingClient || null;

    if (!client) {
      // Generate client fingerprint to check for duplicates
      const fingerprint = generateClientFingerprint({
        email,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      });

      // Check if client with same fingerprint already exists
      const existingClientId = await findClientByFingerprint(fingerprint, db);
      if (existingClientId) {
        const [existing] = await db.select()
          .from(clients)
          .where(eq(clients.id, existingClientId))
          .limit(1);
        
        if (existing) {
          client = existing;
        }
      }

      if (!client) {
        // Create new client
        const [newClient] = await db.insert(clients)
          .values({
            email,
            firstName,
            lastName,
            phone: phone || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            orgId: organizationId,
            clientFingerprint: fingerprint,
          })
          .returning();
        
        client = newClient;
      }

      // Grant attorney access
      try {
        await db.insert(attorneyClientAccess)
          .values({
            attorneyId: user.id,
            clientId: client.id,
            organizationId: organizationId,
            isActive: true,
          });
      } catch (error: any) {
        console.error("Client invite: Access grant failed:", error.message);
      }

      await logAuditEvent({
        action: 'CLIENT_CREATED',
        resourceType: 'client',
        resourceId: client.id,
        details: { email, firstName, lastName },
        userId: user.id,
      })
    }

    let invite = null
    let inviteUrl = null

    if (sendInvite) {
      // Generate a random token
      const token = randomBytes(24).toString('hex')

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 14) // 14-day expiry

      // Create invite
      const [newInvite] = await db.insert(clientInvites)
        .values({
          clientId: client.id,
          email,
          token,
          expiresAt,
          invitedByUserId: user.id,
        })
        .returning();
      
      invite = newInvite;

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      inviteUrl = `${baseUrl}/invite/${invite.token}`

      // Send invite email
      try {
        await sendClientInviteEmail({
          to: email,
          clientName: `${client.firstName} ${client.lastName}`,
          firmName: organizationName,
          inviteUrl,
        })
      } catch (emailError: any) {
        console.error('Failed to send invite email:', emailError)
      }

      await logAuditEvent({
        action: 'INVITE_CREATED',
        resourceType: 'client_invite',
        resourceId: invite.id,
        details: { clientId: client.id, email },
        userId: user.id,
      })
    }

    return NextResponse.json(
      {
        client: {
          id: client.id,
          email: client.email,
          firstName: client.firstName,
          lastName: client.lastName,
        },
        invite: invite
          ? {
              id: invite.id,
              inviteUrl,
              expiresAt: invite.expiresAt,
              token: invite.token,
            }
          : null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating client invite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create client invite' },
      { status: 500 }
    )
  }
}
