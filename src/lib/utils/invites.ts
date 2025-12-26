import { prisma } from '@/lib/db'
import { logAuditEvent } from '@/lib/audit'
import crypto from 'crypto'
import { randomUUID } from 'crypto'

export async function createInvite(
  attorneyId: string,
  organizationId: string | null,
  clientEmail: string
) {
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

  const inviteId = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO invites (id, token, attorney_id, organization_id, client_email, expires_at, status, createdAt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    inviteId,
    token,
    attorneyId,
    organizationId || null,
    clientEmail,
    expiresAt,
    'pending'
  );

  const invite = {
    id: inviteId,
    token,
    attorneyId,
    organizationId,
    clientEmail,
    expiresAt,
    status: 'pending' as const,
    acceptedAt: null as Date | null,
    createdAt: new Date(),
  };

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
  const inviteResult = await prisma.$queryRawUnsafe<Array<{
    id: string,
    token: string,
    attorney_id: string,
    organization_id: string | null;
    client_email: string,
    status: string,
    expires_at: Date;
    accepted_at: Date | null;
    createdAt: Date;
  }>>(
    `SELECT id, token, attorney_id, organization_id, client_email, status, expires_at, accepted_at, createdAt
     FROM invites WHERE token = $1 LIMIT 1`,
    token
  );

  if (!inviteResult || inviteResult.length === 0) {
    throw new Error('Invalid or expired invite');
  }

  const inviteRow = inviteResult[0];
  const invite = {
    id: inviteRow.id,
    token: inviteRow.token,
    attorneyId: inviteRow.attorney_id,
    organizationId: inviteRow.organization_id,
    clientEmail: inviteRow.client_email,
    status: inviteRow.status,
    expiresAt: inviteRow.expires_at,
    acceptedAt: inviteRow.accepted_at,
    createdAt: inviteRow.createdAt,
  };

  if (invite.status !== 'pending') {
    throw new Error('Invalid or expired invite');
  }

  // Check expiry
  if (invite.expiresAt < new Date()) {
    await prisma.$executeRawUnsafe(
      `UPDATE invites SET status = $1 WHERE id = $2`,
      'expired',
      invite.id
    );
    
    throw new Error('Invite has expired');
  }

  // Get user to link client record
  const userResult = await prisma.$queryRawUnsafe<Array<{
    id: string,
    email: string,
    firstName: string | null;
    lastName: string | null;
  }>>(
    `SELECT id, email, firstName, lastName FROM users WHERE id = $1 LIMIT 1`,
    userId
  );

  if (!userResult || userResult.length === 0) {
    throw new Error('User not found');
  }

  const user = {
    id: userResult[0].id,
    email: userResult[0].email,
    firstName: userResult[0].firstName,
    lastName: userResult[0].lastName,
  };

  // Get or create client record
  const clientResult = await prisma.$queryRawUnsafe<Array<{
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    user_id: string | null;
  }>>(
    `SELECT id, email, firstName, lastName, user_id FROM clients WHERE email = $1 LIMIT 1`,
    invite.clientEmail
  );

  let client: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    userId: string | null;
  };

  if (!clientResult || clientResult.length === 0) {
    // Create client record
    const clientId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO clients (id, email, firstName, lastName, user_id, createdAt, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      clientId,
      invite.clientEmail,
      user.firstName || '',
      user.lastName || '',
      user.id
    );
    client = {
      id: clientId,
      email: invite.clientEmail,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      userId: user.id,
    };
  } else {
    const clientRow = clientResult[0];
    client = {
      id: clientRow.id,
      email: clientRow.email,
      firstName: clientRow.firstName,
      lastName: clientRow.lastName,
      userId: clientRow.user_id,
    };

    if (!client.userId && user.id) {
      // Link existing client to user account
      await prisma.$executeRawUnsafe(
        `UPDATE clients SET user_id = $1, updated_at = NOW() WHERE id = $2`,
        user.id,
        client.id
      );
      client.userId = user.id;
    }
  }

  // Grant attorney access
  try {
    const accessId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO attorneyClientAccess (id, attorney_id, client_id, organization_id, is_active, granted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      accessId,
      invite.attorneyId,
      client.id,
      invite.organizationId || null,
      true
    );
  } catch (error: unknown) {
    // May already exist, check if active
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const existingResult = await prisma.$queryRawUnsafe<Array<{
      id: string,
      attorney_id: string,
      clientId:string,
      is_active: boolean;
    }>>(
      `SELECT id, attorney_id, client_id, is_active
       FROM attorneyClientAccess
       WHERE attorney_id = $1 AND client_id = $2
       LIMIT 1`,
      invite.attorneyId,
      client.id
    );

    const existing = existingResult && existingResult.length > 0 ? {
      id: existingResult[0].id,
      attorneyId: existingResult[0].attorney_id,
      clientId: existingResult[0].clientId,
      isActive: existingResult[0].is_active,
    } : null;

    if (!existing || !existing.isActive) {
      // Update to active if exists but inactive
      if (existing) {
        await prisma.$executeRawUnsafe(
          `UPDATE attorneyClientAccess SET is_active = $1, revoked_at = NULL WHERE id = $2`,
          true,
          existing.id
        );
      } else {
        throw new Error(`Failed to grant access: ${errorMessage}`);
      }
    }
  }

  // Update invite status
  await prisma.$executeRawUnsafe(
    `UPDATE invites SET status = $1, accepted_at = NOW() WHERE id = $2`,
    'accepted',
    invite.id
  );

  await logAuditEvent({
    action: 'update',
    resourceType: 'invite',
    resourceId: invite.id,
    details: { status: 'accepted' },
    userId,
  })

  return client
}

