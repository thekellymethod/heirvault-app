/**
 * Script to create a test client invitation code
 * 
 * Usage:
 *   npx tsx scripts/create-test-invite.ts
 * 
 * This will create:
 * - A test client (if one doesn't exist)
 * - A test invitation with token "TEST-INVITE-CODE-12345"
 */

import { prisma } from '../src/lib/db';

const TEST_TOKEN = 'TEST-INVITE-CODE-12345';
const TEST_EMAIL = 'test.client@example.com';
const TEST_CLIENT_NAME = {
  firstName: 'Test',
  lastName: 'Client',
};

async function createTestInvite() {
  try {
    console.log('Creating test invitation...');

    // Check if test invite already exists
    const existingInvite = await prisma.clientInvite.findUnique({
      where: { token: TEST_TOKEN },
    });

    if (existingInvite) {
      console.log(`\n✅ Test invite already exists!`);
      console.log(`\n📧 Email: ${existingInvite.email}`);
      console.log(`🔑 Token: ${existingInvite.token}`);
      console.log(`🔗 URL: http://localhost:3000/invite/${existingInvite.token}`);
      console.log(`📅 Expires: ${existingInvite.expiresAt.toLocaleString()}`);
      console.log(`\nYou can use this code: ${existingInvite.token}`);
      return;
    }

    // Find or create a test client
    let client = await prisma.client.findFirst({
      where: { email: TEST_EMAIL },
    });

    if (!client) {
      console.log('Creating test client...');
      client = await prisma.client.create({
        data: {
          firstName: TEST_CLIENT_NAME.firstName,
          lastName: TEST_CLIENT_NAME.lastName,
          email: TEST_EMAIL,
        },
      });
      console.log(`✅ Created test client: ${client.firstName} ${client.lastName}`);
    } else {
      console.log(`✅ Using existing test client: ${client.firstName} ${client.lastName}`);
    }

    // Create expiration date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Create the invite
    const invite = await prisma.clientInvite.create({
      data: {
        clientId: client.id,
        email: TEST_EMAIL,
        token: TEST_TOKEN,
        expiresAt,
      },
    });

    console.log('\n✅ Test invitation created successfully!');
    console.log('\n📋 Test Details:');
    console.log(`   Email: ${invite.email}`);
    console.log(`   Token: ${invite.token}`);
    console.log(`   Client: ${client.firstName} ${client.lastName}`);
    console.log(`   Expires: ${invite.expiresAt.toLocaleString()}`);
    console.log(`\n🔗 Test URL: http://localhost:3000/invite/${invite.token}`);
    console.log(`\n💡 You can use this code to test: ${invite.token}`);
    console.log(`   Or visit: http://localhost:3000/client/invite-code`);
    console.log(`   And enter the code: ${invite.token}`);
  } catch (error: any) {
    console.error('❌ Error creating test invite:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestInvite();

