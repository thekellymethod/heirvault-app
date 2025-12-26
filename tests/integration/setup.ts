/**
 * Integration Test Setup
 * 
 * Sets up test database and test data for integration tests
 */

import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export interface TestContext {
  testOrgId: string,
  testAttorneyId: string,
  testClientId: string,
  testInsurerId: string,
  cleanup: () => Promise<void>;
}

/**
 * Create test data for integration tests
 */
export async function createTestContext(): Promise<TestContext> {
  // Create test organization
  const testOrg = await db.organizations.create({
    data: {
      id: randomUUID(),
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      billingPlan: "FREE",
    },
  });
  const testOrgId = testOrg.id;

  // Create test attorney
  const testUser = await db.user.create({
    data: {
      clerkId: `test_attorney_${Date.now()}`,
      email: `test_attorney_${Date.now()}@test.com`,
      firstName: "Test",
      lastName: "Attorney",
      role: "attorney",
    },
  });
  const testAttorneyId = testUser.id;

  // Add user to organization
  await db.org_members.create({
    data: {
      id: randomUUID(),
      userId: testUser.id,
      organizationId: testOrgId,
      role: "ATTORNEY",
    },
  });

  // Create test client
  const testClient = await db.clients.create({
    data: {
      id: randomUUID(),
      firstName: "Test",
      lastName: "Client",
      email: `test_client_${Date.now()}@test.com`,
    },
  });
  const testClientId = testClient.id;

  // Grant attorney access to client
  await db.attorneyClientAccess.create({
    data: {
      id: randomUUID(),
      attorneyId: testUser.id,
      clientId: testClient.id,
      organizationId: testOrgId,
      isActive: true,
    },
  });

  // Create test insurer
  const testInsurer = await db.insurers.create({
    data: {
      id: randomUUID(),
      name: `Test Insurance ${Date.now()}`,
      contactPhone: "555-0100",
      contactEmail: "test@insurance.com",
    },
  });
  const testInsurerId = testInsurer.id;

  // Cleanup function
  const cleanup = async () => {
    // Delete in reverse order of dependencies
    if (testClientId) {
      await db.policies.deleteMany({ where: { clientId: testClientId } });
      await db.beneficiaries.deleteMany({ where: { clientId: testClientId } });
      await db.attorneyClientAccess.deleteMany({ where: { clientId: testClientId } });
      await db.clients.delete({ where: { id: testClientId } });
    }
    if (testAttorneyId) {
      await db.org_members.deleteMany({ where: { userId: testAttorneyId } });
      await db.user.delete({ where: { id: testAttorneyId } });
    }
    if (testOrgId) {
      await db.organizations.delete({ where: { id: testOrgId } });
    }
    if (testInsurerId) {
      await db.insurers.delete({ where: { id: testInsurerId } });
    }
  };

  return {
    testOrgId,
    testAttorneyId,
    testClientId,
    testInsurerId,
    cleanup,
  };
}

