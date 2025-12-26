/**
 * Integration Tests: Policy API Routes
 * 
 * Tests the /api/policies route with real database interactions
 * Verifies authentication, authorization, and data integrity
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/policies/route";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// Test data
let testClientId: string;
let testInsurerId: string;
let testAttorneyId: string;
let testOrgId: string;

describe("Policy API Integration Tests", () => {
  beforeAll(async () => {
    // Create test organization
    const testOrg = await db.organizations.create({
      data: {
        id: randomUUID(),
        name: "Test Law Firm",
        slug: `test-firm-${Date.now()}`,
        billingPlan: "FREE",
      },
    });
    testOrgId = testOrg.id;

    // Create test attorney user
    const testUser = await db.user.create({
      data: {
        clerkId: `test_attorney_${Date.now()}`,
        email: `test_attorney_${Date.now()}@test.com`,
        firstName: "Test",
        lastName: "Attorney",
        role: "attorney",
      },
    });
    testAttorneyId = testUser.id;

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
    testClientId = testClient.id;

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
        name: "Test Insurance Company",
        contactPhone: "555-0100",
        contactEmail: "test@insurance.com",
      },
    });
    testInsurerId = testInsurer.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testClientId) {
      await db.policies.deleteMany({ where: { clientId: testClientId } });
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

