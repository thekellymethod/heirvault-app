import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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
    const organizationId = (orgMember && typeof orgMember === "object" && "organizationId" in orgMember && typeof orgMember.organizationId === "string" ? orgMember.organizationId : null) || orgMember.organizations?.id
    const organizationName = orgMember.organizations?.name || 'Your Firm'
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID not found' },
        { status: 404 }
      )
    }

    // Check if client already exists
    const existingClient = await prisma.clients.findFirst({
      where: { email },
    });
    
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
      const existingClientId = await findClientByFingerprint(fingerprint, prisma);
      if (existingClientId) {
        const existing = await prisma.clients.findFirst({
          where: { id: existingClientId },
        });
        
        if (existing) {
          client = existing;
        }
      }

      if (!client) {
        // Create new client
        const newClient = await prisma.clients.create({
          data: {
            email,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
            org_id: organizationId,
            client_fingerprint: fingerprint,
          },
        });
        
        client = newClient;
      }

      // Grant attorney access
      try {
        await prisma.attorney_client_access.create({
          data: {
            id: randomUUID(),
            attorney_id: user.id,
            client_id: client.id,
            organization_id: organizationId,
            is_active: true,
            granted_at: now,
          },
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Client invite: Access grant failed:", errorMessage);
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
      const newInvite = await prisma.client_invites.create({
        data: {
          client_id: client.id,
          email,
          token,
          expires_at: expiresAt,
          invited_by_user_id: user.id,
        },
      });
      
      invite = newInvite;

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      inviteUrl = `${baseUrl}/invite/${invite.token}`

      // Send invite email
      try {
        await sendClientInviteEmail({
          to: email,
          clientName: `${client.first_name} ${client.last_name}`,
          firmName: organizationName,
          inviteUrl,
        })
      } catch (emailError: unknown) {
        const emailErrorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
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
          firstName: client.first_name,
          lastName: client.last_name,
        },
        invite: invite
          ? {
              id: invite.id,
              inviteUrl,
              expiresAt: invite.expires_at,
              token: invite.token,
            }
          : null,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create client invite';
    console.error('Error creating client invite:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
