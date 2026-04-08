import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { logAuditEvent } from '@/lib/audit'
import { randomUUID } from 'crypto'

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

    const { findUnique: findUniqueInvite, findUnique: findUniqueClient, findUnique: findUniqueUser, findMany: findManyOrgMembers, findMany: findManyAccess, create: createAccess, update: updateClient, update: updateInvite, update: updateAccess } = await import("@/lib/db");
    
    type InviteRecord = {
      id: string;
      token: string;
      clientId: string;
      expiresAt: string | Date;
      usedAt: string | Date | null;
      invitedByUserId: string | null;
    };
    
    const invite = await findUniqueInvite<InviteRecord>("client_invites", { token });
    
    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      )
    }

    // Fetch client separately
    const client = await findUniqueClient("clients", { id: invite.clientId });
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const now = new Date();
    const expiresAt = typeof invite.expiresAt === 'string' ? new Date(invite.expiresAt) : invite.expiresAt;
    const usedAt = invite.usedAt ? (typeof invite.usedAt === 'string' ? new Date(invite.usedAt) : invite.usedAt) : null;
    
    if (usedAt || (expiresAt && expiresAt < now)) {
      return NextResponse.json(
        { error: 'Invite expired or already used' },
        { status: 400 }
      )
    }

    const user = await findUniqueUser("users", { clerkId: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    type UserRecord = {
      id: string;
      clerkId: string;
    };
    
    type OrgMemberRecord = {
      id: string;
      userId: string;
      organization_id: string;
    };
    
    type AccessRecord = {
      id: string;
      attorneyId: string;
      clientId: string;
      organizationId: string;
      isActive: boolean;
    };
    
    const dbUser = user as UserRecord;
    
    // Link the client to this user (using userId field, not primaryUserId)
    await updateClient("clients", { id: invite.clientId }, {
      userId: dbUser.id,
      updatedAt: now.toISOString(),
    } as Record<string, unknown>);

    // Mark invite used
    await updateInvite("client_invites", { id: invite.id }, {
      usedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as Record<string, unknown>);

    // Grant attorney access via AttorneyClientAccess
    if (invite.invitedByUserId) {
      const orgMembers = await findManyOrgMembers<OrgMemberRecord>("org_members", {
        where: { userId: invite.invitedByUserId },
        limit: 1,
      });

      if (orgMembers && orgMembers.length > 0) {
        const orgMember = orgMembers[0];
        // Check if access already exists
        const existingAccesses = await findManyAccess<AccessRecord>("attorney_client_access", {
          where: {
            attorneyId: invite.invitedByUserId,
            clientId: invite.clientId,
            organizationId: orgMember.organization_id,
          },
          limit: 1,
        });

        const existingAccess = existingAccesses && existingAccesses.length > 0 ? existingAccesses[0] : null;

        if (!existingAccess) {
          await createAccess("attorney_client_access", {
            id: randomUUID(),
            attorneyId: invite.invitedByUserId,
            clientId: invite.clientId,
            organizationId: orgMember.organization_id,
            isActive: true,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          } as Record<string, unknown>);
        } else if (!existingAccess.isActive) {
          // Reactivate if it was revoked
          await updateAccess("attorney_client_access", { id: existingAccess.id }, {
            isActive: true,
            revokedAt: null,
            updatedAt: now.toISOString(),
          } as Record<string, unknown>);
        }
      }
    }

    await logAuditEvent({
      action: 'INVITE_ACCEPTED',
      metadata: {
        clientId: invite.clientId,
        userId: dbUser.id,
        inviteId: invite.id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}

