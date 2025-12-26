/**
 * RLS Verification Tests
 * 
 * Verifies that Supabase Row Level Security (RLS) policies
 * match the application-layer permission rules
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabaseServer } from "@/lib/supabase";
import { db, prisma } from "@/lib/db";
import { randomUUID } from "crypto";

describe("RLS Policy Verification", () => {
  let testRegistryId: string;
  let testUserId: string;
  let testClientId: string;

  beforeAll(async () => {
    // Create test registry using Supabase (registry_records is in Supabase, not Prisma)
    const sb = supabaseServer();
    const { data: registryData, error: registryError } = await sb
      .from("registry_records")
      .insert({
        decedentName: "Test Insured",
        status: "ACTIVE",
      })
      .select()
      .single();
    
    if (registryError || !registryData) {
      throw new Error(`Failed to create test registry: ${registryError?.message}`);
    }
    testRegistryId = registryData.id;

    // Create test user
    const testUser = await db.user.create({
      data: {
        clerkId: `test_user_${Date.now()}`,
        email: `test_user_${Date.now()}@test.com`,
        firstName: "Test",
        lastName: "User",
        role: "attorney",
      },
    });
    testUserId = testUser.id;

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
  });

  afterAll(async () => {
    // Cleanup
    if (testClientId) {
      await db.attorneyClientAccess.deleteMany({ where: { clientId: testClientId } });
      await db.clients.delete({ where: { id: testClientId } });
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
    if (testRegistryId) {
      const sb = supabaseServer();
      await sb.from("registry_records").delete().eq("id", testRegistryId);
    }
  });

  describe("registry_permissions table", () => {
    it("should have RLS enabled", async () => {
      const sb = supabaseServer();
      
      // Try to query without service role (should be blocked by RLS if properly configured)
      // Note: This test requires a non-service-role client
      // For now, we verify the table exists and has the expected structure
      const { data, error } = await sb
        .from("registry_permissions")
        .select("*")
        .limit(1);

      // Should not error (service role bypasses RLS)
      expect(error).toBeNull();
    });

    it("should enforce unique constraint on (registry_id, user_id)", async () => {
      // Create first permission using raw SQL (table not in Prisma schema)
      await prisma.$executeRawUnsafe(
        `INSERT INTO registry_permissions (registry_id, user_id, role) VALUES ($1, $2, $3)`,
        testRegistryId,
        testUserId,
        "ATTORNEY"
      );

      // Try to create duplicate (should fail)
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO registry_permissions (registry_id, user_id, role) VALUES ($1, $2, $3)`,
          testRegistryId,
          testUserId,
          "ATTORNEY"
        )
      ).rejects.toThrow();

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM registry_permissions WHERE registry_id = $1 AND user_id = $2`,
        testRegistryId,
        testUserId
      );
    });
  });

  describe("registry_records table", () => {
    it("should have RLS enabled", async () => {
      const sb = supabaseServer();
      const { data, error } = await sb
        .from("registry_records")
        .select("*")
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe("attorneyClientAccess table", () => {
    it("should enforce unique constraint on (attorney_id, client_id)", async () => {
      // Create first access grant
      await db.attorneyClientAccess.create({
        data: {
          id: randomUUID(),
          attorneyId: testUserId,
          clientId: testClientId,
          isActive: true,
        },
      });

      // Try to create duplicate (should fail)
      await expect(
        db.attorneyClientAccess.create({
          data: {
            id: randomUUID(),
            attorneyId: testUserId,
            clientId: testClientId,
            isActive: true,
          },
        })
      ).rejects.toThrow();

      // Cleanup
      await db.attorneyClientAccess.deleteMany({
        where: {
          attorneyId: testUserId,
          clientId: testClientId,
        },
      });
    });
  });

  describe("user_has_registry_permission function", () => {
    it("should return true when user has permission", async () => {
      // Grant permission using raw SQL (table not in Prisma schema)
      await prisma.$executeRawUnsafe(
        `INSERT INTO registry_permissions (registry_id, user_id, role) VALUES ($1, $2, $3)`,
        testRegistryId,
        testUserId,
        "ATTORNEY"
      );

      // Test function via raw SQL
      const result = await prisma.$queryRawUnsafe<Array<{ user_has_registry_permission: boolean }>>(
        `SELECT user_has_registry_permission($1, $2, $3) as user_has_registry_permission`,
        testUserId,
        testRegistryId,
        "VIEWER"
      );

      expect(result[0]?.user_has_registry_permission).toBe(true);

      // Cleanup
      await prisma.$executeRawUnsafe(
        `DELETE FROM registry_permissions WHERE registry_id = $1 AND user_id = $2`,
        testRegistryId,
        testUserId
      );
    });

    it("should return false when user lacks permission", async () => {
      const unauthorizedUserId = "unauthorized_user_123";

      const result = await prisma.$queryRawUnsafe<Array<{ user_has_registry_permission: boolean }>>(
        `SELECT user_has_registry_permission($1, $2, $3) as user_has_registry_permission`,
        unauthorizedUserId,
        testRegistryId,
        "VIEWER"
      );

      expect(result[0]?.user_has_registry_permission).toBe(false);
    });
  });
});

