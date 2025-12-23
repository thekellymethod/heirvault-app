import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { AuditAction } from "@/lib/db/enums";
import { randomUUID } from "crypto";

/**
 * Reactivate or reissue an invitation code (admin only)
 * This clears the used_at field and optionally extends the expiry date
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    
    const body = await req.json();
    const { token, extendDays } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Look up the invite
    let invite: {
      id: string;
      client_id: string;
      token: string;
      email: string;
      expires_at: Date;
      used_at: Date | null;
      created_at: Date;
    } | null = null;

    try {
      const inviteResult = await prisma.$queryRawUnsafe<Array<{
        id: string;
        client_id: string;
        token: string;
        email: string;
        expires_at: Date;
        used_at: Date | null;
        created_at: Date;
      }>>(`
        SELECT 
          id,
          client_id,
          token,
          email,
          expires_at,
          used_at,
          created_at
        FROM client_invites
        WHERE token = $1
        LIMIT 1
      `, token);

      if (inviteResult && inviteResult.length > 0) {
        invite = inviteResult[0];
      }
    } catch (sqlError: unknown) {
      const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
      console.error("Reactivate invite: Raw SQL lookup failed:", errorMessage);
      
      // Fallback to Prisma
      try {
        const prismaInvite = await prisma.clientInvite.findUnique({
          where: { token },
        });
        if (prismaInvite) {
          invite = {
            id: prismaInvite.id,
            client_id: prismaInvite.clientId,
            token: prismaInvite.token,
            email: prismaInvite.email,
            expires_at: prismaInvite.expiresAt,
            used_at: prismaInvite.usedAt,
            created_at: prismaInvite.createdAt,
          };
        }
      } catch (prismaError: unknown) {
        const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : String(prismaError);
        console.error("Reactivate invite: Prisma lookup also failed:", prismaErrorMessage);
      }
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Calculate new expiry date
    const newExpiresAt = extendDays 
      ? new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // Default 14 days

    // Reactivate the invite (clear used_at and update expiry)
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE client_invites
        SET used_at = NULL,
            expires_at = $1,
            updated_at = NOW()
        WHERE token = $2
      `, newExpiresAt, token);
    } catch (sqlError: unknown) {
      const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
      console.error("Reactivate invite: Raw SQL update failed:", errorMessage);
      
      // Fallback to Prisma
      await prisma.clientInvite.updateMany({
        where: { token },
        data: {
          usedAt: null,
          expiresAt: newExpiresAt,
        },
      });
    }

    // Audit log the reactivation
    try {
      await audit(AuditAction.INVITE_CREATED, {
        message: `Admin ${admin.email} reactivated invite code ${token} for client ${invite.client_id}`,
        userId: admin.id,
        clientId: invite.client_id,
      });
    } catch (auditError: unknown) {
      const auditErrorMessage = auditError instanceof Error ? auditError.message : String(auditError);
      console.error("Reactivate invite: Audit logging failed:", auditErrorMessage);
      // Continue even if audit fails
    }

    return NextResponse.json({
      success: true,
      invite: {
        token: invite.token,
        email: invite.email,
        expiresAt: newExpiresAt.toISOString(),
        usedAt: null,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error reactivating invite:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to reactivate invite" },
      { status: 500 }
    );
  }
}

