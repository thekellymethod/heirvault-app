import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

/**
 * API endpoint to create a test invitation code
 * 
 * This is for testing purposes only.
 * 
 * Usage:
 *   POST /api/test/create-invite
 *   Body: { email: "test@example.com", firstName: "Test", lastName: "Client" }
 * 
 * Returns:
 *   {
 *     token: "generated-token",
 *     url: "http://localhost:3000/invite/generated-token",
 *     email: "test.client@example.com",
 *     clientName: "Test Client"
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const TEST_EMAIL = body.email || "test.client@example.com";
    const TEST_CLIENT_NAME = {
      firstName: body.firstName || "Test",
      lastName: body.lastName || "Client",
    };
    
    // Generate a unique token
    const TEST_TOKEN = `TEST-${randomBytes(12).toString("hex").toUpperCase()}`;

    // Check if a client with this email already exists and has an active invite
    const existingClient = await prisma.clients.findFirst({
      where: { email: TEST_EMAIL },
      include: {
        client_invites: {
          where: {
            expires_at: { gt: new Date() },
            used_at: null,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // If client exists with active invite, return it
    if (existingClient && existingClient.client_invites.length > 0) {
      const existingInvite = existingClient.client_invites[0];
      const requestUrl = req.nextUrl;
      const baseUrl = 
        process.env.NEXT_PUBLIC_APP_URL || 
        `${requestUrl.protocol}//${requestUrl.host}` ||
        "http://localhost:3000";
      const inviteUrl = `${baseUrl}/invite/${existingInvite.token}`;
      
      return NextResponse.json({
        message: "Active test invite already exists for this email",
        token: existingInvite.token,
        url: inviteUrl,
        email: existingInvite.email,
        clientName: `${existingClient.firstName} ${existingClient.lastName}`,
        clientId: existingClient.id,
        expiresAt: existingInvite.expires_at.toISOString(),
        inviteUrl: inviteUrl,
        inviteCodePage: `${baseUrl}/client/invite-code`,
      });
    }

    // Find or create a test client
    let client = await prisma.clients.findFirst({
      where: { email: TEST_EMAIL },
    });

    if (!client) {
      const clientId = randomUUID();
      const now = new Date();
      client = await prisma.clients.create({
        data: {
          id: clientId,
          firstName: TEST_CLIENT_NAME.firstName,
          lastName: TEST_CLIENT_NAME.lastName,
          email: TEST_EMAIL,
          createdAt: now,
          updated_at: now,
        },
      });
    }

    // Create expiration date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Create the invite
    const invite = await prisma.client_invites.create({
      data: {
        id: randomUUID(),
        clientId: client.id,
        email: TEST_EMAIL,
        token: TEST_TOKEN,
        expires_at: expiresAt,
        createdAt: new Date(),
        updated_at: new Date(),
      },
      include: { clients: true },
    });

    // Get base URL from request if available, otherwise use env or default
    const requestUrl = req.nextUrl;
    const baseUrl = 
      process.env.NEXT_PUBLIC_APP_URL || 
      `${requestUrl.protocol}//${requestUrl.host}` ||
      "http://localhost:3000";

    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    return NextResponse.json({
      message: "Test invitation created successfully",
      token: invite.token,
      url: inviteUrl,
      email: invite.email,
      clientName: `${client.firstName} ${client.lastName}`,
      clientId: client.id,
      expiresAt: invite.expires_at.toISOString(),
      inviteUrl: inviteUrl,
      inviteCodePage: `${baseUrl}/client/invite-code`,
      instructions: [
        `1. Use this code: ${invite.token}`,
        `2. Visit: ${baseUrl}/client/invite-code`,
        `3. Enter the code: ${invite.token}`,
        `4. Or directly visit: ${inviteUrl}`,
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating test invite:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create test invite" },
      { status: 500 }
    );
  }
}

