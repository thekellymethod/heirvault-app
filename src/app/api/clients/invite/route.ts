import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'
import { sendClientInviteEmail } from '@/lib/email'
import { getCurrentUserWithOrg } from '@/lib/authz'
import { generateClientFingerprint, findClientByFingerprint } from '@/lib/client-fingerprint'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth('attorney')
    const body = await req.json().catch(() => ({}))
    
    const {
      email,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      sendInvite = true,
    } = body

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Get user's organization
    const { orgMember } = await getCurrentUserWithOrg()
    if (!orgMember) {
      return NextResponse.json(
        { error: 'Organization not found. Please ensure you have an organization set up.' },
        { status: 404 }
      )
    }

    // Get organization ID from orgMember
    // orgMember has organizationId (from org_members table) and organizations (relation)
    const organizationId = (orgMember as any).organizationId || orgMember.organizations?.id
    const organizationName = orgMember.organizations?.name || 'Your Firm'
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID not found' },
        { status: 404 }
      )
    }

    // Check if client already exists - use raw SQL first to avoid Prisma client issues
    let client: any = null;
    try {
      const rawResult = await prisma.$queryRaw<Array<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        date_of_birth: Date | null;
      }>>`
        SELECT id, email, first_name, last_name, phone, date_of_birth
        FROM clients
        WHERE email = ${email}
        LIMIT 1
      `;
      
      if (rawResult && rawResult.length > 0) {
        const row = rawResult[0];
        client = {
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          dateOfBirth: row.date_of_birth,
        };
      }
    } catch (sqlError: any) {
      console.error("Client invite: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        client = await prisma.client.findFirst({
          where: { email },
        });
      } catch (prismaError: any) {
        console.error("Client invite: Prisma also failed:", prismaError.message);
        // Try with plural model name
        try {
          client = await (prisma as any).clients.findFirst({
            where: { email },
          });
        } catch (prismaError2: any) {
          console.error("Client invite: Prisma clients.findFirst also failed:", prismaError2.message);
          // Continue - will create new client
          client = null;
        }
      }
    }

    if (!client) {
      // Generate client fingerprint to check for duplicates
      const fingerprint = generateClientFingerprint({
        email,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      });

      // Check if client with same fingerprint already exists
      const existingClientId = await findClientByFingerprint(fingerprint, prisma);
      if (existingClientId) {
        // Use existing client instead of creating duplicate
        const existingResult = await prisma.$queryRaw<Array<{
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          date_of_birth: Date | null;
        }>>`
          SELECT id, email, first_name, last_name, phone, date_of_birth
          FROM clients
          WHERE id = ${existingClientId}
        `;
        
        if (existingResult && existingResult.length > 0) {
          const row = existingResult[0];
          client = {
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            dateOfBirth: row.date_of_birth,
          };
        }
      }

      if (!client) {
        // Create new client - use raw SQL first
        const clientId = randomBytes(16).toString('hex')
        try {
          await prisma.$executeRaw`
            INSERT INTO clients (id, email, first_name, last_name, phone, date_of_birth, org_id, client_fingerprint, created_at, updated_at)
            VALUES (${clientId}, ${email}, ${firstName}, ${lastName}, ${phone || null}, ${dateOfBirth ? new Date(dateOfBirth) : null}, ${organizationId}, ${fingerprint}, NOW(), NOW())
          `
        
          // Fetch the created client
          const createdResult = await prisma.$queryRaw<Array<{
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            phone: string | null;
            date_of_birth: Date | null;
          }>>`
            SELECT id, email, first_name, last_name, phone, date_of_birth
            FROM clients
            WHERE id = ${clientId}
          `
          
          if (createdResult && createdResult.length > 0) {
            const row = createdResult[0];
            client = {
              id: row.id,
              email: row.email,
              firstName: row.first_name,
              lastName: row.last_name,
              phone: row.phone,
              dateOfBirth: row.date_of_birth,
            };
          }
        } catch (sqlError: any) {
        console.error("Client invite: Raw SQL create failed, trying Prisma:", sqlError.message);
        // Fallback to Prisma
        try {
          client = await prisma.clients.create({
            data: {
              email,
              firstName,
              lastName,
              phone: phone || null,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              orgId: organizationId,
            },
          });
        } catch (prismaError: any) {
          console.error("Client invite: Prisma create also failed:", prismaError.message);
          throw new Error("Failed to create client");
        }
      }

      // Grant attorney access - use raw SQL first
      try {
        const accessId = randomBytes(16).toString('hex')
        await prisma.$executeRaw`
          INSERT INTO attorney_client_access (id, attorney_id, client_id, organization_id, is_active, granted_at)
          VALUES (${accessId}, ${user.id}, ${client.id}, ${organizationId}, true, NOW())
        `
      } catch (sqlError: any) {
        console.error("Client invite: Raw SQL access grant failed, trying Prisma:", sqlError.message);
        // Fallback to Prisma
        try {
          await prisma.attorneyClientAccess.create({
            data: {
              attorneyId: user.id,
              clientId: client.id,
              organizationId: organizationId,
              isActive: true,
            },
          });
        } catch (prismaError: any) {
          console.error("Client invite: Prisma access grant also failed:", prismaError.message);
          // Continue - access grant is important but not critical for invite creation
        }
      }

      await logAuditEvent({
        action: 'CLIENT_CREATED',
        resourceType: 'client',
        resourceId: client.id,
        details: { email, firstName, lastName },
        userId: user.id,
      })
    }

    let invite = null
    let inviteUrl = null

    if (sendInvite) {
      // Generate a random token
      const token = randomBytes(24).toString('hex')

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 14) // 14-day expiry

      // Create invite - use raw SQL first
      const inviteId = randomBytes(16).toString('hex')
      try {
        await prisma.$executeRaw`
          INSERT INTO client_invites (id, client_id, email, token, expires_at, invited_by_user_id, created_at, updated_at)
          VALUES (${inviteId}, ${client.id}, ${email}, ${token}, ${expiresAt}, ${user.id}, NOW(), NOW())
        `
        
        // Fetch the created invite
        const inviteResult = await prisma.$queryRaw<Array<{
          id: string;
          client_id: string;
          email: string;
          token: string;
          expires_at: Date;
          created_at: Date;
        }>>`
          SELECT id, client_id, email, token, expires_at, created_at
          FROM client_invites
          WHERE id = ${inviteId}
        `
        
        if (inviteResult && inviteResult.length > 0) {
          const row = inviteResult[0];
          invite = {
            id: row.id,
            clientId: row.client_id,
            email: row.email,
            token: row.token,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
          };
        }
      } catch (sqlError: any) {
        console.error("Client invite: Raw SQL invite create failed, trying Prisma:", sqlError.message);
        // Fallback to Prisma
        try {
          // Try both possible model names
          if ((prisma as any).client_invites) {
            invite = await (prisma as any).client_invites.create({
              data: {
                client_id: client.id,
                email,
                token,
                expires_at: expiresAt,
                invited_by_user_id: user.id,
              },
            });
          } else if ((prisma as any).clientInvite) {
            invite = await (prisma as any).clientInvite.create({
              data: {
                clientId: client.id,
                email,
                token,
                expiresAt,
                invitedByUserId: user.id,
              },
            });
          } else {
            throw new Error("Neither client_invites nor clientInvite model found");
          }
        } catch (prismaError: any) {
          console.error("Client invite: Prisma invite create also failed:", prismaError.message);
          throw new Error("Failed to create invite");
        }
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      inviteUrl = `${baseUrl}/invite/${invite.token}`

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
        resourceType: 'client_invite',
        resourceId: invite.id,
        details: { clientId: client.id, email },
        userId: user.id,
      })
    }

    return NextResponse.json(
      {
        client: {
          id: client.id,
          email: client.email,
          firstName: client.firstName,
          lastName: client.lastName,
        },
        invite: invite
          ? {
              id: invite.id,
              inviteUrl,
              expiresAt: invite.expiresAt,
              token: invite.token,
            }
          : null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating client invite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create client invite' },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 500 }
    )
  }
}

