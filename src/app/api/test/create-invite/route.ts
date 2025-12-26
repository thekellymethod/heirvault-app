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
        clientInvites: {
          where: {
            expiresAt: { gt: new Date() },
            usedAt: null,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // If client exists with active invite, return it
    if (existingClient && existingClient.clientInvites.length > 0) {
      const existingInvite = existingClient.clientInvites[0];
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
        expiresAt: existingInvite.expiresAt.toISOString(),
        inviteUrl: inviteUrl,
        inviteCodePage: `${baseUrl}/client/invite-code`,
      });
    }

    // Find or create a test client
    let client = await prisma.clients.findFirst({
      where: { email: TEST_EMAIL },
    });

    if (!client) {
      const clientId = crypto.randomUUID();
      const now = new Date();
      client = await prisma.clients.create({
        data: {
          id: clientId,
          firstName: TEST_CLIENT_NAME.firstName,
          lastName: TEST_CLIENT_NAME.lastName,
          email: TEST_EMAIL,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // Create expiration date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Create the invite
    const invite = await prisma.client_invites.create({
      data: {
        id: crypto.randomUUID(),
        clientId: client.id,
        email: TEST_EMAIL,
        token: TEST_TOKEN,
        expiresAt: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
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
      expiresAt: invite.expiresAt.toISOString(),
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating test invite:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to create test invite" },
      { status: 500 }
    );
  }
}

