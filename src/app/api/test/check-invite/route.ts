import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token parameter is required" },
        { status: 400 }
      );
    }

    const invite = await prisma.client_invites.findUnique({
      where: { token },
      include: { clients: true },
    });

    if (!invite) {
      return NextResponse.json({
        exists: false,
        message: "Invite not found in database",
      });
    }

    const now = new Date();
    const daysSinceExpiration = (now.getTime() - invite.expires_at.getTime()) / (1000 * 60 * 60 * 24);
    const isExpired = daysSinceExpiration > 30;

    return NextResponse.json({
      exists: true,
      invite: {
        token: invite.token,
        email: invite.email,
        clientName: `${invite.clients.firstName} ${invite.clients.lastName}`,
        expiresAt: invite.expires_at.toISOString(),
        usedAt: invite.used_at?.toISOString() || null,
        daysSinceExpiration: Math.round(daysSinceExpiration * 100) / 100,
        isExpired,
        isValid: !isExpired,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking invite:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check invite" },
      { status: 500 }
    );
  }
}

