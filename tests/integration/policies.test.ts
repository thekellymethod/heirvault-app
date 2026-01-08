/**
 * Integration Tests: Policy API Routes
 * 
 * Tests the /api/policies route with real database interactions
 * Verifies authentication, authorization, and data integrity
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/policies/route";
import { create, findUnique, deleteRecord, findMany } from "@/lib/db";
import { randomUUID } from "crypto";

// Test data
let testClientId: string;
let testInsurerId: string;
let testAttorneyId: string;
let testOrgId: string;

describe("Policy API Integration Tests", () => {
  beforeAll(async () => {
    const now = new Date().toISOString();
    
    // Create test organization
    const orgId = randomUUID();
    await create("organizations", {
      id: orgId,
      name: "Test Law Firm",
      slug: `test-firm-${Date.now()}`,
      billingPlan: "FREE",
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
    testOrgId = orgId;

    // Create test attorney user
    const userId = randomUUID();
    await create("users", {
      id: userId,
      clerkId: `test_attorney_${Date.now()}`,
      email: `test_attorney_${Date.now()}@test.com`,
      firstName: "Test",
      lastName: "Attorney",
      role: "ATTORNEY",
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
    testAttorneyId = userId;

    // Add user to organization
    await create("org_members", {
      id: randomUUID(),
      userId: userId,
      organizationId: testOrgId,
      role: "ATTORNEY",
      createdAt: now,
    } as Record<string, unknown>);

    // Create test client
    const clientId = randomUUID();
    await create("clients", {
      id: clientId,
      firstName: "Test",
      lastName: "Client",
      email: `test_client_${Date.now()}@test.com`,
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
    testClientId = clientId;

    // Grant attorney access to client
    await create("attorney_client_access", {
      id: randomUUID(),
      attorneyId: userId,
      clientId: clientId,
      organizationId: testOrgId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);

    // Create test insurer
    const insurerId = randomUUID();
    await create("insurers", {
      id: insurerId,
      name: "Test Insurance Company",
      contactPhone: "555-0100",
      contactEmail: "test@insurance.com",
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
    testInsurerId = insurerId;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testClientId) {
      const policies = await findMany("policies", { where: { clientId: testClientId } });
      for (const policy of policies || []) {
        await deleteRecord("policies", { id: (policy as { id: string }).id });
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
  });

  describe("POST /api/policies", () => {
    it("should create a policy when attorney has access to client", async () => {
      // Mock getCurrentUserWithOrg to return test attorney
      vi.doMock("@/lib/authz", () => ({
        getCurrentUserWithOrg: async () => ({
          user: {
            id: testAttorneyId,
            email: "test@test.com",
            role: "attorney",
          },
          orgMember: {
            organizationId: testOrgId,
            role: "ATTORNEY",
          },
        }),
        assertAttorneyCanAccessClient: async () => ({
          user: { id: testAttorneyId },
          orgMember: { organizationId: testOrgId },
        }),
      }));

      const req = new NextRequest("http://localhost:3000/api/policies", {
        method: "POST",
        body: JSON.stringify({
          clientId: testClientId,
          insurerName: "Test Insurance Company",
          policyNumber: "POL-12345",
          policyType: "TERM",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("clientId", testClientId);
      expect(data).toHaveProperty("policyNumber", "POL-12345");
    });

    it("should return 400 when required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/policies", {
        method: "POST",
        body: JSON.stringify({
          clientId: testClientId,
          // Missing insurerName
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
    });
  });

  describe("GET /api/policies", () => {
    it("should return policies for authorized client", async () => {
      // Mock getCurrentUserWithOrg
      vi.doMock("@/lib/authz", () => ({
        getCurrentUserWithOrg: async () => ({
          user: {
            id: testAttorneyId,
            email: "test@test.com",
            role: "attorney",
          },
          orgMember: {
            organizationId: testOrgId,
            role: "ATTORNEY",
          },
        }),
        assertAttorneyCanAccessClient: async () => ({
          user: { id: testAttorneyId },
          orgMember: { organizationId: testOrgId },
        }),
      }));

      const req = new NextRequest(`http://localhost:3000/api/policies?clientId=${testClientId}`, {
        method: "GET",
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it("should return 400 when clientId:is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/policies", {
        method: "GET",
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
    });
  });
});

