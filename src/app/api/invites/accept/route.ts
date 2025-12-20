import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { logAuditEvent } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      )
    }

    const invite = await prisma.clientInvite.findUnique({
      where: { token },
      include: { client: true },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    const now = new Date()
    if (invite.usedAt || invite.expiresAt < now) {
      return NextResponse.json(
        { error: 'Invite expired or already used' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Link the client to this user (using userId field, not primaryUserId)
    await prisma.client.update({
      where: { id: invite.clientId },
      data: {
        userId: user.id,
      },
    })

    // Mark invite used
    await prisma.clientInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: now,
      },
    })

    // Grant attorney access via AttorneyClientAccess
    if (invite.invitedByUserId) {
      const orgMember = await prisma.orgMember.findFirst({
        where: { userId: invite.invitedByUserId },
      })

      if (orgMember) {
        // Check if access already exists
        const existingAccess = await prisma.attorneyClientAccess.findFirst({
          where: {
            attorneyId: invite.invitedByUserId,
            clientId: invite.clientId,
            organizationId: orgMember.organizationId,
          },
        })

        if (!existingAccess) {
          await prisma.attorneyClientAccess.create({
            data: {
              attorneyId: invite.invitedByUserId,
              clientId: invite.clientId,
              organizationId: orgMember.organizationId,
              isActive: true,
            },
          })
        } else if (!existingAccess.isActive) {
          // Reactivate if it was revoked
          await prisma.attorneyClientAccess.update({
            where: { id: existingAccess.id },
            data: { isActive: true, revokedAt: null },
          })
        }
      }
    }

    await logAuditEvent({
      action: 'INVITE_ACCEPTED',
      resourceType: 'client_invite',
      resourceId: invite.id,
      details: { clientId: invite.clientId, userId: user.id },
      userId: user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}

