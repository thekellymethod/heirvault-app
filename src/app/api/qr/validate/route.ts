import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/qr";
import { prisma } from "@/lib/db";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

export const runtime = "nodejs";

/**
 * Validate QR token and return invite token for the client
 * This endpoint validates signed QR tokens and returns the corresponding invite token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { qrToken } = body;

    if (!qrToken) {
      return NextResponse.json(
        { error: "QR token is required" },
        { status: 400 }
      );
    }

    // Verify the QR token (signed token from receipts)
    const verification = verifyToken(qrToken);
    
    if (!verification.valid) {
      return NextResponse.json(
        { 
          error: "Invalid or expired QR code",
          reason: verification.reason 
        },
        { status: 403 }
      );
    }

    // Extract clientId:from the token payload (stored as registryId)
    const clientId = verification.payload?.registryId;
    
    if (!clientId) {
      return NextResponse.json(
        { error: "QR code does not contain valid client information" },
        { status: 400 }
      );
    }

    // Verify client exists
    const clientExists = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM clients WHERE id = $1 LIMIT 1
    `, clientId);

    if (!clientExists || clientExists.length === 0) {
      return NextResponse.json(
        { error: "Client record not found" },
        { status: 404 }
      );
    }

    // Find the invite token for this client
    // Try test invites first, then regular invites
    let inviteToken: string | null = null;

    // Check test invites
    const testInvites = await prisma.$queryRawUnsafe<Array<{ token: string }>>(`
      SELECT token FROM client_invites 
      WHERE clientId = $1 
        AND (expires_at > NOW() OR expires_at IS NULL)
      ORDER BY createdAt DESC
      LIMIT 1
    `, clientId);

    if (testInvites && testInvites.length > 0) {
      inviteToken = testInvites[0].token;
    } else {
      // Check regular invites
      const regularInvites = await prisma.$queryRawUnsafe<Array<{ token: string }>>(`
        SELECT token FROM client_invites 
        WHERE clientId = $1 
          AND expires_at > NOW()
        ORDER BY createdAt DESC
        LIMIT 1
      `, clientId);

      if (regularInvites && regularInvites.length > 0) {
        inviteToken = regularInvites[0].token;
      }
    }

    if (!inviteToken) {
      return NextResponse.json(
        { error: "No valid invite found for this client. Please contact support." },
        { status: 404 }
      );
    }

    // Verify the invite token is valid
    let invite = await getOrCreateTestInvite(inviteToken);
    if (!invite) {
      invite = await lookupClientInvite(inviteToken) as { id: string; clientId: string; email: string; token: string; expiresAt: Date; usedAt: Date | null; createdAt: Date; client: { id: string; firstName: string; lastName: string; email: string; phone: string | null; dateOfBirth: Date | null; }; };
    }

    if (!invite || invite.clientId !== clientId) {
      return NextResponse.json(
        { error: "Invite token validation failed" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      inviteToken,
      clientId,
      message: "QR code validated successfully",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error validating QR token:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to validate QR code" },
      { status: 500 }
    );
  }
}

