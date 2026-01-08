import { NextRequest, NextResponse } from "next/server";
;

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

    const { findUnique: findUniqueInvite, findUnique: findUniqueClient } = await import("@/lib/db");
    
    const inviteRecord = await findUniqueInvite<{
      token: string;
      email: string;
      expiresAt: string | Date;
      usedAt: string | Date | null;
      clientId: string;
    }>("client_invites", { token });
    
    if (!inviteRecord) {
      return NextResponse.json({
        exists: false,
        message: "Invite not found in database",
      });
    }
    
    const client = await findUniqueClient<{ firstName: string; lastName: string }>("clients", { id: inviteRecord.clientId });
    
    const invite = {
      ...inviteRecord,
      clients: client || { firstName: "", lastName: "" },
    };

    const now = new Date();
    const expiresAtDate = typeof invite.expiresAt === 'string' ? new Date(invite.expiresAt) : invite.expiresAt;
    const daysSinceExpiration = (now.getTime() - expiresAtDate.getTime()) / (1000 * 60 * 60 * 24);
    const isExpired = daysSinceExpiration > 30;

    return NextResponse.json({
      exists: true,
      invite: {
        token: invite.token,
        email: invite.email,
        clientName: `${invite.clients.firstName} ${invite.clients.lastName}`,
        expiresAt: expiresAtDate.toISOString(),
        usedAt: invite.usedAt ? (typeof invite.usedAt === 'string' ? invite.usedAt : new Date(invite.usedAt).toISOString()) : null,
        daysSinceExpiration: Math.round(daysSinceExpiration * 100) / 100,
        isExpired,
        isValid: !isExpired,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking invite:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

