import { prisma } from '@/lib/db'
import { logAuditEvent } from '@/lib/audit'
import crypto from 'crypto'

export async function createInvite(
  attorneyId: string,
  organizationId: string | null,
  clientEmail: string
) {
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

  const invite = await prisma.invite.create({
    data: {
      token,
      attorneyId,
      organizationId,
      clientEmail,
      expiresAt,
      status: 'pending',
    },
  })

  await logAuditEvent({
    action: 'create',
    resourceType: 'invite',
    resourceId: invite.id,
    details: { clientEmail },
    userId: attorneyId,
  })

  return { ...invite, inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}` }
}

export async function acceptInvite(token: string, userId: string) {
  // Get invite
  const invite = await prisma.invite.findUnique({
    where: { token },
  })

  if (!invite || invite.status !== 'pending') {
    throw new Error('Invalid or expired invite')
  }

  // Check expiry
  if (invite.expiresAt < new Date()) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'expired' },
    })
    
    throw new Error('Invite has expired')
  }

  // Get user to link client record
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Get or create client record
  let client = await prisma.client.findFirst({
    where: { email: invite.clientEmail },
  })

  if (!client) {
    // Create client record
    client = await prisma.client.create({
      data: {
        email: invite.clientEmail,
        firstName: user.firstName || '', // Will be filled by client
        lastName: user.lastName || '', // Will be filled by client
        userId: user.id, // Link to user account
      },
    })
  } else if (!client.userId && user.id) {
    // Link existing client to user account
    client = await prisma.client.update({
      where: { id: client.id },
      data: { userId: user.id },
    })
  }

  // Grant attorney access
  try {
    await prisma.attorneyClientAccess.create({
      data: {
        attorneyId: invite.attorneyId,
        clientId: client.id,
        organizationId: invite.organizationId,
        isActive: true,
      },
    })
  } catch (error: any) {
    // May already exist, check if active
    const existing = await prisma.attorneyClientAccess.findUnique({
      where: {
        attorneyId_clientId: {
          attorneyId: invite.attorneyId,
          clientId: client.id,
        },
      },
    })

    if (!existing || !existing.isActive) {
      // Update to active if exists but inactive
      if (existing) {
        await prisma.attorneyClientAccess.update({
          where: { id: existing.id },
          data: { isActive: true, revokedAt: null },
        })
      } else {
        throw new Error(`Failed to grant access: ${error.message}`)
      }
    }
  }

  // Update invite status
  await prisma.invite.update({
    where: { id: invite.id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
    },
  })

  await logAuditEvent({
    action: 'update',
    resourceType: 'invite',
    resourceId: invite.id,
    details: { status: 'accepted' },
    userId,
  })

  return client
}

