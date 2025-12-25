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

    const invite = await prisma.client_invites.findUnique({
      where: { token },
      include: { clients: true },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    const now = new Date()
    if (invite.used_at || invite.expires_at < now) {
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
    await prisma.clients.update({
      where: { id: invite.client_id },
      data: {
        user_id: user.id,
      },
    })

    // Mark invite used
    await prisma.client_invites.update({
      where: { id: invite.id },
      data: {
        used_at: now,
      },
    })

    // Grant attorney access via AttorneyClientAccess
    if (invite.invited_by_user_id) {
      const orgMember = await prisma.org_members.findFirst({
        where: { user_id: invite.invited_by_user_id },
      })

      if (orgMember) {
        // Check if access already exists
        const existingAccess = await prisma.attorney_client_access.findFirst({
          where: {
            attorney_id: invite.invited_by_user_id,
            client_id: invite.client_id,
            organization_id: orgMember.organization_id,
          },
        })

        if (!existingAccess) {
          await prisma.attorney_client_access.create({
            data: {
              attorney_id: invite.invited_by_user_id,
              client_id: invite.client_id,
              organization_id: orgMember.organization_id,
              is_active: true,
            },
          })
        } else if (!existingAccess.is_active) {
          // Reactivate if it was revoked
          await prisma.attorney_client_access.update({
            where: { id: existingAccess.id },
            data: { is_active: true, revoked_at: null },
          })
        }
      }
    }

    await logAuditEvent({
      action: 'INVITE_ACCEPTED',
      resourceType: 'client_invite',
      resourceId: invite.id,
      details: { clientId: invite.client_id, userId: user.id },
      userId: user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}

