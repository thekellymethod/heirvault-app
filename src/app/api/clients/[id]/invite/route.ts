import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuthApi } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'
import { sendClientInviteEmail } from '@/lib/email'
import { getCurrentUserWithOrg } from '@/lib/authz'
import { randomBytes } from 'crypto'

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
    const client = await prisma.clients.findFirst({
      where: { id },
    });

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
    const invite = await prisma.client_invites.create({
      data: {
        id: inviteId,
        client_id: id,
        email,
        token,
        expires_at: expiresAt,
        invited_by_user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const inviteUrl = `${baseUrl}/invite/${invite.token}`

    // Get organization name for email
    const { orgMember } = await getCurrentUserWithOrg()
    const organizationName = orgMember?.organizations?.name || 'Your Firm'

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
      // Continue even if email fails - we still return the URL
    }

    await logAuditEvent({
      action: 'INVITE_CREATED',
      resourceType: 'client_invite',
      resourceId: inviteId,
      details: { email, clientId: id },
      userId: user.id,
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
