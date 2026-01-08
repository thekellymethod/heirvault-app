import { NextRequest, NextResponse } from "next/server";
;
import { requireAdmin } from "@/lib/auth/guards";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/db/enums";
import { randomBytes, randomUUID } from "crypto";
import { sendClientInviteEmail } from "@/lib/email/notifications";

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
      const { queryRaw, create: createClient, findUnique: findUniqueClient } = await import("@/lib/db");
      const { randomUUID } = await import("crypto");
      
      const clientResult = await queryRaw<Array<{
        id: string,
        email: string,
        firstName: string,
        lastName: string,
      }>>(`
        SELECT id, email, "firstName", "lastName"
        FROM clients
        WHERE email = $1
        LIMIT 1
      `, [normalizedEmail]);

      if (clientResult && clientResult.length > 0 && clientResult[0]) {
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
        const clientId = randomUUID();
        const now = new Date().toISOString();
        await createClient("clients", {
          id: clientId,
          email: normalizedEmail,
          firstName,
          lastName,
          phone: phone || null,
          dateOfBirth: dateOfBirth || null,
          createdAt: now,
          updatedAt: now,
        } as Record<string, unknown>);

        // Query the created client
        const createdClient = await findUniqueClient<{
          id: string,
          email: string,
          firstName: string,
          lastName: string,
        }>("clients", { email: normalizedEmail });
        
        if (createdClient) {
          client = createdClient;
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
        await logAuditEvent({
          userId: admin.id,
          action: AuditAction.CLIENT_CREATED,
          clientId: client.id,
          metadata: {
            message: `Admin ${admin.email} created new client ${client.id} via invite generation`,
          },
        });
      } catch (auditError: unknown) {
        const auditErrorMessage = auditError instanceof Error ? auditError.message : String(auditError);
        console.error("Generate invite: Client creation audit logging failed:", auditErrorMessage);
      }
    }

    if (!client) {
      return NextResponse.json(
        { error: "Failed to create or find client" },
        { status: 500 }
      );
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
      const inviteId = randomUUID();
      const inviteNow = new Date().toISOString();
      const { create: createInvite } = await import("@/lib/db");
      await createInvite("client_invites", {
        id: inviteId,
        clientId: client.id,
        token,
        email: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
        invitedByUserId: admin.id,
        createdAt: inviteNow,
        updatedAt: inviteNow,
      } as Record<string, unknown>);

      // Query the created invite
      const createdInvite = await findUniqueClient<{
        id: string,
        token: string,
        email: string,
        expiresAt: string;
        createdAt: string;
      }>("client_invites", { token });

      if (createdInvite) {
        invite = {
          id: createdInvite.id,
          token: createdInvite.token,
          email: createdInvite.email,
          expires_at: new Date(createdInvite.expiresAt),
          createdAt: new Date(createdInvite.createdAt),
        };
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

    if (!invite) {
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    // Audit log invite creation
    try {
      await logAuditEvent({
        userId: admin.id,
        action: AuditAction.INVITE_CREATED,
        clientId: client.id,
        metadata: {
          message: `Admin ${admin.email} generated invite code ${invite.token} for client ${client.id}`,
        },
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

