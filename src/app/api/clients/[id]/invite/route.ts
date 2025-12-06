import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { requireAuth } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'
import { sendClientInviteEmail } from '@/lib/email'
import { getCurrentUserWithOrg } from '@/lib/authz'
import { randomBytes } from 'crypto'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth('attorney')
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check access
    const access = await prisma.attorneyClientAccess.findFirst({
      where: {
        attorneyId: user.id,
        clientId: id,
        isActive: true,
      },
    })

    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate a random token
    const token = randomBytes(24).toString('hex')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14) // 14-day expiry

    const invite = await prisma.clientInvite.create({
      data: {
        clientId: id,
        email,
        token,
        expiresAt,
        invitedByUserId: user.id,
      },
    })

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const inviteUrl = `${baseUrl}/invite/${invite.token}`

    // Get organization name for email
    const { orgMember } = await getCurrentUserWithOrg()

    // Send invite email
    try {
      await sendClientInviteEmail({
        to: email,
        clientName: `${client.firstName} ${client.lastName}`,
        firmName: orgMember?.organization.name,
        inviteUrl,
      })
    } catch (emailError: any) {
      console.error('Failed to send invite email:', emailError)
      // Continue even if email fails - we still return the URL
    }

    await logAuditEvent({
      action: 'create',
      resourceType: 'client_invite',
      resourceId: invite.id,
      details: { clientId: id, email },
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

