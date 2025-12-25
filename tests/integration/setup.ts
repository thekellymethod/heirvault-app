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
  const { organizations, users, orgMembers, clients, insurers, attorneyClientAccess } = await import("@/lib/db");
  const { eq } = await import("@/lib/db");

  // Create test organization
  const [testOrg] = await db.insert(organizations)
    .values({
      name: `Test Org ${Date.now()}`,
      slug: `test-org-${Date.now()}`,
      billingPlan: "FREE",
    })
    .returning();
  const testOrgId = testOrg.id;

  // Create test attorney
  const [testUser] = await db.insert(users)
    .values({
      clerkId: `test_attorney_${Date.now()}`,
      email: `test_attorney_${Date.now()}@test.com`,
      firstName: "Test",
      lastName: "Attorney",
      role: "attorney",
    })
    .returning();
  const testAttorneyId = testUser.id;

  // Add user to organization
  await db.insert(orgMembers)
    .values({
      userId: testUser.id,
      organizationId: testOrgId,
      role: "ATTORNEY",
    });

  // Create test client
  const [testClient] = await db.insert(clients)
    .values({
      firstName: "Test",
      lastName: "Client",
      email: `test_client_${Date.now()}@test.com`,
    })
    .returning();
  const testclientId = testClient.id;

  // Grant attorney access to client
  await db.insert(attorneyClientAccess)
    .values({
      attorneyId: testUser.id,
      clientId: testClient.id,
      organizationId: testOrgId,
      isActive: true,
    });

  // Create test insurer
  const [testInsurer] = await db.insert(insurers)
    .values({
      name: `Test Insurance ${Date.now()}`,
      contactPhone: "555-0100",
      contactEmail: "test@insurance.com",
    })
    .returning();
  const testInsurerId = testInsurer.id;

  // Cleanup function
  const cleanup = async () => {
    const { policies, beneficiaries } = await import("@/lib/db");
    
    // Delete in reverse order of dependencies
    if (testClientId) {
      await db.delete(policies).where(eq(policies.clientId, testClientId));
      await db.delete(beneficiaries).where(eq(beneficiaries.clientId, testClientId));
      await db.delete(attorneyClientAccess).where(eq(attorneyClientAccess.clientId, testClientId));
      await db.delete(clients).where(eq(clients.id, testClientId));
    }
    if (testAttorneyId) {
      await db.delete(orgMembers).where(eq(orgMembers.userId, testAttorneyId));
      await db.delete(users).where(eq(users.id, testAttorneyId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
    if (testInsurerId) {
      await db.delete(insurers).where(eq(insurers.id, testInsurerId));
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

