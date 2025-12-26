import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

const testClients = [
  { email: "test1@example.com", firstName: "John", lastName: "Doe", token: "TEST-CODE-001" },
  { email: "test2@example.com", firstName: "Jane", lastName: "Smith", token: "TEST-CODE-002" },
  { email: "test3@example.com", firstName: "Bob", lastName: "Johnson", token: "TEST-CODE-003" },
  { email: "test4@example.com", firstName: "Alice", lastName: "Williams", token: "TEST-CODE-004" },
  { email: "test5@example.com", firstName: "Charlie", lastName: "Brown", token: "TEST-CODE-005" },
];

async function populateInvites(baseUrl: string) {
  const invites: Array<{ token: string, email: string, name: string, url: string }> = [];

  for (const clientData of testClients) {
    // Find or create client
    let client = await prisma.clients.findFirst({
      where: { email: clientData.email },
    });

    if (!client) {
      const clientId = randomUUID();
      const now = new Date();
      client = await prisma.clients.create({
        data: {
          id: clientId,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // Check if invite already exists
    const existingInvite = await prisma.client_invites.findUnique({
      where: { token: clientData.token },
    });

    if (existingInvite) {
      const url = `${baseUrl}/invite/${clientData.token}`;
      invites.push({
        token: clientData.token,
        email: clientData.email,
        name: `${clientData.firstName} ${clientData.lastName}`,
        url,
      });
      continue;
    }

    // Create expiration (14 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Create invite with fixed token
    await prisma.client_invites.create({
      data: {
        id: randomUUID(),
        clientId: client.id,
        email: clientData.email,
        token: clientData.token,
        expiresAt: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const url = `${baseUrl}/invite/${clientData.token}`;
    invites.push({
      token: clientData.token,
      email: clientData.email,
      name: `${clientData.firstName} ${clientData.lastName}`,
      url,
    });
  }

  return invites;
}

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || "http://localhost:3000";
    const invites = await populateInvites(baseUrl);

    return NextResponse.json({
      success: true,
      message: "Test invitation codes created successfully",
      invites,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create test invites";
    console.error("Error creating test invites:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || "http://localhost:3000";
    const invites = await populateInvites(baseUrl);

    return NextResponse.json({
      success: true,
      message: "Test invitation codes created successfully",
      invites,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create test invites";
    console.error("Error creating test invites:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

