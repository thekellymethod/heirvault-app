import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'
import { sendClientInviteEmail } from '@/lib/email/notifications'
import { randomBytes, randomUUID } from 'crypto'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireAuthApi();
  if (authResult.response) return authResult.response;
  const { user } = authResult;

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      )
    }

    // Verify client exists
    const { findUnique, create: createDb } = await import("@/lib/db");
    
    type ClientRecord = {
      id: string;
      firstName: string;
      lastName: string;
      [key: string]: unknown;
    };
    
    const client = await findUnique<ClientRecord>("clients", { id });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // All attorneys have global access - no need to check access grants
    // Generate a random token
    const token = randomBytes(24).toString('hex')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14) // 14-day expiry

    const inviteId = randomUUID();
    const invite = await createDb("client_invites", {
      id: inviteId,
      clientId: id,
      email,
      token,
      expiresAt: expiresAt.toISOString(),
      invitedByUserId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const inviteUrl = `${baseUrl}/invite/${(invite as { token: string }).token}`

    // Get organization name for email (simplified - can be enhanced later)
    const organizationName = 'Your Firm'

    // Send invite email
    try {
      await sendClientInviteEmail({
        to: email,
        clientName: `${client.firstName} ${client.lastName}`,
        firmName: organizationName,
        inviteUrl,
      })
    } catch (emailError: unknown) {
      const _emailErrorMessage = emailError instanceof Error ? emailError.message : "Unknown error";
      console.error('Failed to send invite email:', emailError)
      // Continue even if email fails - we still return the URL
    }

    await logAuditEvent({
      action: 'INVITE_CREATED',
      userId: user.id,
      metadata: { 
        resourceType: 'client_invite',
        resourceId: inviteId,
        email, 
        clientId: id 
      },
    })

    return NextResponse.json(
      {
        inviteId: invite.id,
        inviteUrl,
        expiresAt,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create invite';
    console.error('Error creating client invite:', error)
    const status = message === 'Unauthorized' || message === 'Forbidden' ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
