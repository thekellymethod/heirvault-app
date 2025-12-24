/**
 * Simple script to create test invitation codes
 * Run with: npx tsx scripts/create-test-invites.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const testClients = [
  { email: "test1@example.com", firstName: "John", lastName: "Doe", token: "TEST-CODE-001" },
  { email: "test2@example.com", firstName: "Jane", lastName: "Smith", token: "TEST-CODE-002" },
  { email: "test3@example.com", firstName: "Bob", lastName: "Johnson", token: "TEST-CODE-003" },
  { email: "test4@example.com", firstName: "Alice", lastName: "Williams", token: "TEST-CODE-004" },
  { email: "test5@example.com", firstName: "Charlie", lastName: "Brown", token: "TEST-CODE-005" },
];

async function createTestInvites() {
  console.log("Creating test invitation codes...\n");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invites: Array<{ token: string; email: string; name: string; url: string }> = [];

  for (const clientData of testClients) {
    // Find or create client
    let client = await prisma.client.findFirst({
      where: { email: clientData.email },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email,
        },
      });
      console.log(`Created client: ${clientData.firstName} ${clientData.lastName}`);
    } else {
      console.log(`Using existing client: ${clientData.firstName} ${clientData.lastName}`);
    }

    // Check if invite already exists
    const existingInvite = await prisma.clientInvite.findUnique({
      where: { token: clientData.token },
    });

    if (existingInvite) {
      console.log(`Invite ${clientData.token} already exists, skipping...`);
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
    const invite = await prisma.clientInvite.create({
      data: {
        clientId: client.id,
        email: clientData.email,
        token: clientData.token,
        expiresAt,
      },
    });

    const url = `${baseUrl}/invite/${token}`;
    invites.push({
      token,
      email: clientData.email,
      name: `${clientData.firstName} ${clientData.lastName}`,
      url,
    });

    console.log(`✅ Created invite for ${clientData.firstName} ${clientData.lastName}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("TEST INVITATION CODES");
  console.log("=".repeat(80) + "\n");

  invites.forEach((invite, index) => {
    console.log(`${index + 1}. ${invite.name} (${invite.email})`);
    console.log(`   Token: ${invite.token}`);
    console.log(`   URL: ${invite.url}`);
    console.log("");
  });

  console.log("=".repeat(80));
  console.log("\nYou can now use these codes to test the client invitation portal!");
  console.log(`Visit: ${baseUrl}/client/invite-code`);
  console.log(`Or directly visit any of the URLs above\n`);
}

createTestInvites()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

