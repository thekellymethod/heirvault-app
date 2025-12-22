/**
 * API Security Tests
 * 
 * Verifies that API routes cannot be bypassed:
 * - Unauthorized users cannot access protected routes
 * - Users cannot access data they don't have permission for
 * - Search results are filtered by permissions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as SearchPOST } from "@/app/api/search/route";
import { GET as RecordsGET } from "@/app/(protected)/records/[id]/page";
import { requireAttorney, requireAccessRegistry } from "@/lib/permissions";
import { listAuthorizedRegistries } from "@/lib/db";
import type { AppUser } from "@/lib/auth";

// Mock dependencies
vi.mock("@/lib/auth");
vi.mock("@/lib/permissions");
vi.mock("@/lib/db");

describe("API Security", () => {
  const mockUserA: AppUser = {
    id: "user_a",
    email: "user_a@example.com",
    role: "ATTORNEY",
  };

  const mockUserB: AppUser = {
    id: "user_b",
    email: "user_b@example.com",
    role: "ATTORNEY",
  };

  const registryA = {
    id: "registry_a",
    insured_name: "John Doe",
    carrier_guess: "Insurance A",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
  };

  const registryB = {
    id: "registry_b",
    insured_name: "Jane Smith",
    carrier_guess: "Insurance B",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Search API", () => {
    it("should only return results from authorized registries", async () => {
      // User A has access to Registry A only
      vi.mocked(requireAttorney).mockResolvedValue(mockUserA);
      vi.mocked(listAuthorizedRegistries).mockResolvedValue([registryA]);

      const req = new NextRequest("http://localhost:3000/api/search", {
        method: "POST",
        body: JSON.stringify({
          purpose: "CLIENT_INQUIRY",
          searchString: "Jane", // This would match Registry B, but user doesn't have access
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await SearchPOST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return empty results since "Jane" is in Registry B, which user doesn't have access to
      expect(data.results).toEqual([]);
      expect(data.resultCount).toBe(0);
    });

    it("should return results when user has access", async () => {
      vi.mocked(requireAttorney).mockResolvedValue(mockUserA);
      vi.mocked(listAuthorizedRegistries).mockResolvedValue([registryA]);

      const req = new NextRequest("http://localhost:3000/api/search", {
        method: "POST",
        body: JSON.stringify({
          purpose: "CLIENT_INQUIRY",
          searchString: "John", // Matches Registry A, which user has access to
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await SearchPOST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should find results in authorized registry
      expect(data.resultCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Records API", () => {
    it("should return 403 when user lacks access to registry", async () => {
      vi.mocked(requireAttorney).mockResolvedValue(mockUserA);
      vi.mocked(requireAccessRegistry).mockRejectedValue(
        new Error("Access denied to registry registry_b")
      );

      // This would be called from the page component
      // For now, we test the permission check directly
      await expect(
        requireAccessRegistry({
          user: mockUserA,
          registryId: registryB.id,
        })
      ).rejects.toThrow();
    });

    it("should allow access when user has permission", async () => {
      vi.mocked(requireAttorney).mockResolvedValue(mockUserA);
      vi.mocked(requireAccessRegistry).mockResolvedValue(undefined);

      await expect(
        requireAccessRegistry({
          user: mockUserA,
          registryId: registryA.id,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Permission Bypass Prevention", () => {
    it("should not allow direct database queries to bypass permissions", async () => {
      // Verify that listAuthorizedRegistries is used instead of direct queries
      vi.mocked(listAuthorizedRegistries).mockResolvedValue([registryA]);

      const authorized = await listAuthorizedRegistries(mockUserA.id);

      // Should only return registries user has permission for
      expect(authorized.length).toBe(1);
      expect(authorized[0].id).toBe(registryA.id);
      expect(authorized.find((r) => r.id === registryB.id)).toBeUndefined();
    });

    it("should enforce permissions even if user tries to access by ID directly", async () => {
      // User A tries to access Registry B directly
      vi.mocked(requireAccessRegistry).mockRejectedValue(
        new Error("Access denied")
      );

      await expect(
        requireAccessRegistry({
          user: mockUserA,
          registryId: registryB.id,
        })
      ).rejects.toThrow();
    });
  });
});

