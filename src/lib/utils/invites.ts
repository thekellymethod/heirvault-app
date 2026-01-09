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

  type InviteRecord = {
    id: string;
    token: string;
    attorneyId: string;
    organizationId: string | null;
    clientEmail: string;
    expiresAt: string;
    status: string;
    createdAt: string;
  };

  const inviteId = randomUUID();
  const { create: createDb } = await import("@/lib/db");
  await createDb<InviteRecord>("invites", {
    id: inviteId,
    token,
    attorneyId,
    organizationId: organizationId || null,
    clientEmail,
    expiresAt: expiresAt.toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

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

  const { AuditAction } = await import("@/lib/db/enums");
  await logAuditEvent({
    action: AuditAction.INVITE_CREATED,
    userId: attorneyId,
    metadata: { inviteId: invite.id, clientEmail },
  })

  return { ...invite, inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}` }
}

export async function acceptInvite(token: string, userId: string) {
  // Get invite
  type InviteRow = {
    id: string;
    token: string;
    attorneyId?: string;
    attorney_id?: string;
    organizationId?: string | null;
    organization_id?: string | null;
    clientEmail?: string;
    client_email?: string;
    status: string;
    expiresAt?: string | Date;
    expires_at?: string | Date;
    acceptedAt?: string | Date | null;
    accepted_at?: string | Date | null;
    createdAt: string;
  };

  const { findMany: findManyInvites, update: updateInviteExpired } = await import("@/lib/db");
  const invites = await findManyInvites<InviteRow>("invites", {
    where: { token },
    limit: 1,
  });

  if (!invites || invites.length === 0) {
    throw new Error('Invalid or expired invite');
  }

  const inviteRow = invites[0];
  const invite = {
    id: inviteRow.id,
    token: inviteRow.token,
    attorneyId: inviteRow.attorneyId || inviteRow.attorney_id || '',
    organizationId: inviteRow.organizationId || inviteRow.organization_id || null,
    clientEmail: inviteRow.clientEmail || inviteRow.client_email || '',
    status: inviteRow.status,
    expiresAt: inviteRow.expiresAt || inviteRow.expires_at || '',
    acceptedAt: inviteRow.acceptedAt || inviteRow.accepted_at || null,
    createdAt: inviteRow.createdAt,
  };

  if (invite.status !== 'pending') {
    throw new Error('Invalid or expired invite');
  }

  // Check expiry
  const expiresAtDate = invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
  if (expiresAtDate < new Date()) {
    await updateInviteExpired("invites", { id: invite.id }, {
      status: 'expired',
      updatedAt: new Date().toISOString(),
    });
    
    throw new Error('Invite has expired');
  }

  // Get user to link client record
  type UserRecord = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };

  const { findUnique } = await import("@/lib/db");
  const userRecord = await findUnique<UserRecord>("users", { id: userId });

  if (!userRecord) {
    throw new Error('User not found');
  }

  const user = {
    id: userRecord.id,
    email: userRecord.email,
    firstName: userRecord.firstName,
    lastName: userRecord.lastName,
  };

  // Get or create client record
  type ClientRecord = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userId?: string | null;
    user_id?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };

  const { findMany: findManyClients, create: createDbRecord, update: updateClientRecord } = await import("@/lib/db");
  const existingClients = await findManyClients<ClientRecord>("clients", {
    where: { email: invite.clientEmail },
    limit: 1,
  });

  let client: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    userId: string | null;
  };

  if (!existingClients || existingClients.length === 0) {
    // Create client record
    const clientId = randomUUID();
    const newClient = await createDbRecord<ClientRecord>("clients", {
      id: clientId,
      email: invite.clientEmail,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      userId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    client = {
      id: newClient.id,
      email: newClient.email,
      firstName: newClient.firstName,
      lastName: newClient.lastName,
      userId: newClient.userId || newClient.user_id || user.id,
    };
  } else {
    const clientRow = existingClients[0];
    client = {
      id: clientRow.id,
      email: clientRow.email,
      firstName: clientRow.firstName,
      lastName: clientRow.lastName,
      userId: clientRow.userId || clientRow.user_id || null,
    };

    if (!client.userId && user.id) {
      // Link existing client to user account
      await updateClientRecord("clients", { id: client.id }, {
        userId: user.id,
        updatedAt: new Date().toISOString(),
      });
      client.userId = user.id;
    }
  }

  // Grant attorney access
  type AttorneyClientAccessRecord = {
    id: string;
    attorneyId?: string;
    attorney_id?: string;
    clientId?: string;
    client_id?: string;
    organizationId?: string | null;
    organization_id?: string | null;
    isActive?: boolean;
    is_active?: boolean;
    grantedAt?: string;
    granted_at?: string;
  };

  const { create: createAccess, findMany: findManyAccess, update: updateAccess } = await import("@/lib/db");
  
  try {
    const accessId = randomUUID();
    await createAccess<AttorneyClientAccessRecord>("attorney_client_access", {
      id: accessId,
      attorneyId: invite.attorneyId,
      clientId: client.id,
      organizationId: invite.organizationId || null,
      isActive: true,
      grantedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    // May already exist, check if active
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try to find existing access record
    let existingResults = await findManyAccess<AttorneyClientAccessRecord>("attorney_client_access", {
      where: {
        attorneyId: invite.attorneyId,
        clientId: client.id,
      },
      limit: 1,
    });

    // If not found with camelCase, try snake_case using direct Supabase query
    if (!existingResults || existingResults.length === 0) {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      const { data } = await db
        .from("attorney_client_access")
        .select("*")
        .eq("attorney_id", invite.attorneyId)
        .eq("client_id", client.id)
        .limit(1);
      existingResults = (data || []) as AttorneyClientAccessRecord[];
    }

    const existing = existingResults && existingResults.length > 0 ? {
      id: existingResults[0].id,
      attorneyId: existingResults[0].attorneyId || existingResults[0].attorney_id || invite.attorneyId,
      clientId: existingResults[0].clientId || existingResults[0].client_id || client.id,
      isActive: existingResults[0].isActive ?? existingResults[0].is_active ?? false,
    } : null;

    if (!existing || !existing.isActive) {
      // Update to active if exists but inactive
      if (existing) {
        await updateAccess("attorney_client_access", { id: existing.id }, {
          isActive: true,
          revokedAt: null,
          updatedAt: new Date().toISOString(),
        });
      } else {
        throw new Error(`Failed to grant access: ${errorMessage}`);
      }
    }
  }

  // Update invite status
  const { update: updateInviteStatus } = await import("@/lib/db");
  await updateInviteStatus("invites", { id: invite.id }, {
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { AuditAction } = await import("@/lib/db/enums");
  await logAuditEvent({
    action: AuditAction.INVITE_ACCEPTED,
    userId,
    metadata: { inviteId: invite.id, status: 'accepted' },
  })

  return client
}
