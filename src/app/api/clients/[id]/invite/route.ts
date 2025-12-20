import { NextRequest, NextResponse } from 'next/server'
import { db, clients, clientInvites, attorneyClientAccess, eq } from '@/lib/db'
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
    const [client] = await db.select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

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

    const [invite] = await db.insert(clientInvites)
      .values({
        clientId: id,
        email,
        token,
        expiresAt,
        invitedByUserId: user.id,
      })
      .returning();

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
        clientName: `${client.firstName} ${client.lastName}`,
        firmName: organizationName,
        inviteUrl,
      })
    } catch (emailError: any) {
      console.error('Failed to send invite email:', emailError)
      // Continue even if email fails - we still return the URL
    }

    await logAuditEvent({
      action: 'INVITE_CREATED',
      message: `Created client invite for ${email}`,
      userId: user.id,
      clientId: id,
    })

    return NextResponse.json(
      {
        inviteId: invite.id,
        inviteUrl,
        expiresAt,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating client invite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create invite' },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 500 }
    )
  }
}
