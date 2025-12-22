/**
 * Integration Tests: Beneficiary API Routes
 * 
 * Tests the /api/beneficiaries route with real database interactions
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/beneficiaries/route";
import { db, clients, beneficiaries, attorneyClientAccess, users, orgMembers, organizations } from "@/lib/db";
import { eq } from "@/lib/db";
import { randomUUID } from "crypto";

let testClientId: string;
let testAttorneyId: string;
let testOrgId: string;

describe("Beneficiary API Integration Tests", () => {
  beforeAll(async () => {
    // Setup test data (similar to policies test)
    const [testOrg] = await db.insert(organizations)
      .values({
        name: "Test Law Firm",
        slug: `test-firm-beneficiaries-${Date.now()}`,
        billingPlan: "FREE",
      })
      .returning();
    testOrgId = testOrg.id;

    const [testUser] = await db.insert(users)
      .values({
        clerkId: `test_attorney_beneficiaries_${Date.now()}`,
        email: `test_attorney_beneficiaries_${Date.now()}@test.com`,
        firstName: "Test",
        lastName: "Attorney",
        role: "attorney",
      })
      .returning();
    testAttorneyId = testUser.id;

    await db.insert(orgMembers)
      .values({
        userId: testUser.id,
        organizationId: testOrgId,
        role: "ATTORNEY",
      });

    const [testClient] = await db.insert(clients)
      .values({
        firstName: "Test",
        lastName: "Client",
        email: `test_client_beneficiaries_${Date.now()}@test.com`,
      })
      .returning();
    testClientId = testClient.id;

    await db.insert(attorneyClientAccess)
      .values({
        attorneyId: testUser.id,
        clientId: testClient.id,
        organizationId: testOrgId,
        isActive: true,
      });
  });

  afterAll(async () => {
    // Cleanup
    if (testClientId) {
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

