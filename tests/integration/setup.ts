/**
 * Integration Test Setup
 * 
 * Sets up test database and test data for integration tests
 */

import { create, findMany, deleteRecord } from "@/lib/db";
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
  const now = new Date().toISOString();
  
  // Create test organization
  const testOrgId = randomUUID();
  await create("organizations", {
    id: testOrgId,
    name: `Test Org ${Date.now()}`,
    slug: `test-org-${Date.now()}`,
    billingPlan: "FREE",
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>);

  // Create test attorney
  const testAttorneyId = randomUUID();
  await create("users", {
    id: testAttorneyId,
    clerkId: `test_attorney_${Date.now()}`,
    email: `test_attorney_${Date.now()}@test.com`,
    firstName: "Test",
    lastName: "Attorney",
    role: "ATTORNEY",
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>);

  // Add user to organization
  await create("org_members", {
    id: randomUUID(),
    userId: testAttorneyId,
    organizationId: testOrgId,
    role: "ATTORNEY",
    createdAt: now,
  } as Record<string, unknown>);

  // Create test client
  const testClientId = randomUUID();
  await create("clients", {
    id: testClientId,
    firstName: "Test",
    lastName: "Client",
    email: `test_client_${Date.now()}@test.com`,
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>);

  // Grant attorney access to client
  await create("attorney_client_access", {
    id: randomUUID(),
    attorneyId: testAttorneyId,
    clientId: testClientId,
    organizationId: testOrgId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>);

  // Create test insurer
  const testInsurerId = randomUUID();
  await create("insurers", {
    id: testInsurerId,
    name: `Test Insurance ${Date.now()}`,
    contactPhone: "555-0100",
    contactEmail: "test@insurance.com",
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>);

  // Cleanup function
  const cleanup = async () => {
    // Delete in reverse order of dependencies
    if (testClientId) {
      const policies = await findMany("policies", { where: { clientId: testClientId } });
      for (const policy of policies || []) {
        await deleteRecord("policies", { id: (policy as { id: string }).id });
      }
      const beneficiaries = await findMany("beneficiaries", { where: { clientId: testClientId } });
      for (const beneficiary of beneficiaries || []) {
        await deleteRecord("beneficiaries", { id: (beneficiary as { id: string }).id });
      }
      const accessGrants = await findMany("attorney_client_access", { where: { clientId: testClientId } });
      for (const grant of accessGrants || []) {
        await deleteRecord("attorney_client_access", { id: (grant as { id: string }).id });
      }
      await deleteRecord("clients", { id: testClientId });
    }
    if (testAttorneyId) {
      const members = await findMany("org_members", { where: { userId: testAttorneyId } });
      for (const member of members || []) {
        await deleteRecord("org_members", { id: (member as { id: string }).id });
      }
      await deleteRecord("users", { id: testAttorneyId });
    }
    if (testOrgId) {
      await deleteRecord("organizations", { id: testOrgId });
    }
    if (testInsurerId) {
      await deleteRecord("insurers", { id: testInsurerId });
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

