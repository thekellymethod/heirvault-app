/**
 * Integration Tests: Beneficiary API Routes
 * 
 * Tests the /api/beneficiaries route with real database interactions
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/beneficiaries/route";
import { create, findUnique, deleteRecord, findMany } from "@/lib/db";
import { randomUUID } from "crypto";

let testClientId: string;
let testAttorneyId: string;
let testOrgId: string;

describe("Beneficiary API Integration Tests", () => {
  beforeAll(async () => {
    const now = new Date().toISOString();
    
    // Setup test data (similar to policies test)
    const orgId = randomUUID();
    await create("organizations", {
      id: orgId,
      name: "Test Law Firm",
      slug: `test-firm-beneficiaries-${Date.now()}`,
      billingPlan: "FREE",
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
    testOrgId = orgId;

    const userId = randomUUID();
    await create("users", {
      id: userId,
      clerkId: `test_attorney_beneficiaries_${Date.now()}`,
      email: `test_attorney_beneficiaries_${Date.now()}@test.com`,
      firstName: "Test",
      lastName: "Attorney",
      role: "ATTORNEY",
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
    testAttorneyId = userId;

    await create("org_members", {
      id: randomUUID(),
      userId: userId,
      organizationId: testOrgId,
      role: "ATTORNEY",
      createdAt: now,
    } as Record<string, unknown>);

    const clientId = randomUUID();
    await create("clients", {
      id: clientId,
      firstName: "Test",
      lastName: "Client",
      email: `test_client_beneficiaries_${Date.now()}@test.com`,
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
    testClientId = clientId;

    await create("attorney_client_access", {
      id: randomUUID(),
      attorneyId: userId,
      clientId: clientId,
      organizationId: testOrgId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>);
  });

  afterAll(async () => {
    // Cleanup
    if (testClientId) {
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
  });

  describe("POST /api/beneficiaries", () => {
    it("should create a beneficiary when required fields are provided", async () => {
      vi.doMock("@/lib/utils/clerk", () => ({
        requireAuthApi: async () => ({
          user: {
            id: testAttorneyId,
            email: "test@test.com",
            role: "attorney",
          },
        }),
      }));

      const req = new NextRequest("http://localhost:3000/api/beneficiaries", {
        method: "POST",
        body: JSON.stringify({
          clientId: testClientId,
          firstName: "John",
          lastName: "Beneficiary",
          relationship: "Son",
          email: "john@example.com",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("firstName", "John");
      expect(data).toHaveProperty("lastName", "Beneficiary");
    });

    it("should return 400 when required fields are missing", async () => {
      vi.doMock("@/lib/utils/clerk", () => ({
        requireAuthApi: async () => ({
          user: {
            id: testAttorneyId,
            email: "test@test.com",
            role: "attorney",
          },
        }),
      }));

      const req = new NextRequest("http://localhost:3000/api/beneficiaries", {
        method: "POST",
        body: JSON.stringify({
          clientId: testClientId,
          // Missing firstName and lastName
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

  describe("GET /api/beneficiaries", () => {
    it("should return beneficiaries for authorized client", async () => {
      vi.doMock("@/lib/utils/clerk", () => ({
        requireAuthApi: async () => ({
          user: {
            id: testAttorneyId,
            email: "test@test.com",
            role: "attorney",
          },
        }),
      }));

      const req = new NextRequest(`http://localhost:3000/api/beneficiaries?clientId=${testClientId}`, {
        method: "GET",
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

