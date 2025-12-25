import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { AuditAction } from "@/lib/db/enums";
import { randomBytes } from "crypto";
import { sendClientInviteEmail } from "@/lib/email";

/**
 * Generate a new invitation code for a policyholder (admin only)
 * Creates a new client if they don't exist, then generates an invite
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    
    const body = await req.json();
    const { email, firstName, lastName, phone, dateOfBirth, sendEmail = true } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if client already exists
    let client: {
      id: string,
      email: string,
      firstName: string,
      lastName: string,
    } | null = null;

    try {
      const clientResult = await prisma.$queryRawUnsafe<Array<{
        id: string,
        email: string,
        firstName: string,
        lastName: string,
      }>>(`
        SELECT id, email, firstName, lastName
        FROM clients
        WHERE email = $1
        LIMIT 1
      `, normalizedEmail);

      if (clientResult && clientResult.length > 0) {
        client = clientResult[0];
      }
    } catch (sqlError: unknown) {
      const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
      console.error("Generate invite: Raw SQL client lookup failed:", errorMessage);
      // Continue - client will be null and we'll create it
    }

    // Create client if they don't exist
    if (!client) {
      try {
        // Insert client and get the ID
        await prisma.$executeRawUnsafe(`
          INSERT INTO clients (id, email, firstName, lastName, phone, dateOfBirth, createdAt, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
        `, normalizedEmail, firstName, lastName, phone || null, dateOfBirth || null);

        // Query the created client
        const createdClientResult = await prisma.$queryRawUnsafe<Array<{
          id: string,
          email: string,
          firstName: string,
          lastName: string,
        }>>(`
          SELECT id, email, firstName, lastName
          FROM clients
          WHERE email = $1
          LIMIT 1
        `, normalizedEmail);

        if (createdClientResult && createdClientResult.length > 0) {
          client = createdClientResult[0];
        } else {
          return NextResponse.json(
            { error: "Failed to create client" },
            { status: 500 }
          );
        }
      } catch (sqlError: unknown) {
        const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
        console.error("Generate invite: Raw SQL client creation failed:", errorMessage);
        return NextResponse.json(
          { error: `Failed to create client: ${errorMessage}` },
          { status: 500 }
        );
      }

      // Audit log client creation
      try {
        await audit(AuditAction.CLIENT_CREATED, {
          message: `Admin ${admin.email} created new client ${client.id} via invite generation`,
          userId: admin.id,
          clientId: client.id,
        });
      } catch (auditError: unknown) {
        const auditErrorMessage = auditError instanceof Error ? auditError.message : String(auditError);
        console.error("Generate invite: Client creation audit logging failed:", auditErrorMessage);
      }
    }

    // Generate invite token
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14-day expiry

    // Create invite
    let invite: {
      id: string,
      token: string,
      email: string,
      expires_at: Date;
      createdAt: Date;
    } | null = null;

    try {
      // Insert invite
      await prisma.$executeRawUnsafe(`
        INSERT INTO client_invites (id, clientId, token, email, expires_at, invited_by_user_id, createdAt, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      `, client.id, token, normalizedEmail, expiresAt, admin.id);

      // Query the created invite
      const createdInviteResult = await prisma.$queryRawUnsafe<Array<{
        id: string,
        token: string,
        email: string,
        expires_at: Date;
        createdAt: Date;
      }>>(`
        SELECT id, token, email, expires_at, createdAt
        FROM client_invites
        WHERE token = $1
        LIMIT 1
      `, token);

      if (createdInviteResult && createdInviteResult.length > 0) {
        invite = createdInviteResult[0];
      } else {
        return NextResponse.json(
          { error: "Failed to create invite" },
          { status: 500 }
        );
      }
    } catch (sqlError: unknown) {
      const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
      console.error("Generate invite: Raw SQL invite creation failed:", errorMessage);
      return NextResponse.json(
        { error: `Failed to create invite: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Generate invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    // Send invite email if requested
    if (sendEmail) {
      try {
        await sendClientInviteEmail({
          to: normalizedEmail,
          clientName: `${firstName} ${lastName}`,
          firmName: "HeirVault",
          inviteUrl,
        });
      } catch (emailError: unknown) {
        const emailErrorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error("Generate invite: Failed to send invite email:", emailErrorMessage);
        // Continue even if email fails
      }
    }

    // Audit log invite creation
    try {
      await audit(AuditAction.INVITE_CREATED, {
        message: `Admin ${admin.email} generated invite code ${invite.token} for client ${client.id}`,
        userId: admin.id,
        clientId: client.id,
      });
    } catch (auditError: unknown) {
      const auditErrorMessage = auditError instanceof Error ? auditError.message : String(auditError);
      console.error("Generate invite: Audit logging failed:", auditErrorMessage);
      // Continue even if audit fails
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        token: invite.token,
        inviteUrl,
        email: invite.email,
        expiresAt: invite.expires_at.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      },
      client: {
        id: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating invite:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to generate invite" },
      { status: 500 }
    );
  }
}

