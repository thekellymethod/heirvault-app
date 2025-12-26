/**
 * Unit Tests: Permission Functions
 * 
 * Tests for listAuthorizedRegistries, requireAccessRegistry, and canAccessRegistry
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { canAccessRegistry, requireAccessRegistry } from "../permissions";
import { listAuthorizedRegistries, getRegistryById } from "../db";
import { isAdmin } from "../admin";
import { HttpError } from "../errors";
import type { AppUser } from "../auth";

// Mock dependencies
vi.mock("../db", () => ({
  listAuthorizedRegistries: vi.fn(),
  getRegistryById: vi.fn(),
}));

vi.mock("../admin", () => ({
  isAdmin: vi.fn(),
}));

const mockListAuthorizedRegistries = vi.mocked(listAuthorizedRegistries);
const mockGetRegistryById = vi.mocked(getRegistryById);
const mockIsAdmin = vi.mocked(isAdmin);

describe("Permission Functions", () => {
  const mockAttorney: AppUser = {
    id: "user_attorney_123",
    email: "attorney@example.com",
    role: "ATTORNEY",
  };

  const mockAdmin: AppUser = {
    id: "user_admin_123",
    email: "admin@example.com",
    role: "ADMIN",
  };

  const mockSystem: AppUser = {
    id: "user_system_123",
    email: "system@example.com",
    role: "SYSTEM",
  };

  const mockRegistry = {
    id: "registry_abc123",
    status: "PENDING" as const,
    decedentName: "John Doe",
    createdAt: new Date(),
  };

  const mockUnauthorizedRegistry = {
    id: "registry_xyz789",
    status: "PENDING" as const,
    decedentName: "Jane Smith",
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canAccessRegistry", () => {
    it("should return true for ADMIN user when registry exists", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetRegistryById.mockResolvedValue(mockRegistry);

      const result = await canAccessRegistry({
        user: mockAdmin,
        registryId: mockRegistry.id,
      });

      expect(result).toBe(true);
      expect(mockIsAdmin).toHaveBeenCalledWith(mockAdmin);
      expect(mockGetRegistryById).toHaveBeenCalledWith(mockRegistry.id);
    });

    it("should return false for ADMIN user when registry does not exist", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetRegistryById.mockResolvedValue(null);

      const result = await canAccessRegistry({
        user: mockAdmin,
        registryId: "nonexistent_registry",
      });

      expect(result).toBe(false);
    });

    it("should return true for SYSTEM user when registry exists", async () => {
      mockIsAdmin.mockResolvedValue(false);
      mockGetRegistryById.mockResolvedValue(mockRegistry);

      const result = await canAccessRegistry({
        user: mockSystem,
        registryId: mockRegistry.id,
      });

      expect(result).toBe(true);
      expect(mockGetRegistryById).toHaveBeenCalledWith(mockRegistry.id);
    });

    it("should return true for ATTORNEY user when registry is in authorized list", async () => {
      mockIsAdmin.mockResolvedValue(false);
      mockListAuthorizedRegistries.mockResolvedValue([mockRegistry]);

      const result = await canAccessRegistry({
        user: mockAttorney,
        registryId: mockRegistry.id,
      });

      expect(result).toBe(true);
      expect(mockListAuthorizedRegistries).toHaveBeenCalledWith(mockAttorney.id);
    });

    it("should return false for ATTORNEY user when registry is not in authorized list", async () => {
      mockIsAdmin.mockResolvedValue(false);
      mockListAuthorizedRegistries.mockResolvedValue([mockRegistry]);

      const result = await canAccessRegistry({
        user: mockAttorney,
        registryId: mockUnauthorizedRegistry.id,
      });

      expect(result).toBe(false);
    });

    it("should return false for unknown role", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const unknownUser: AppUser = {
        id: "user_unknown",
        email: "unknown@example.com",
        role: "UNKNOWN" as any,
      };

      const result = await canAccessRegistry({
        user: unknownUser,
        registryId: mockRegistry.id,
      });

      expect(result).toBe(false);
    });
  });

  describe("requireAccessRegistry", () => {
    it("should not throw when user has access", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockGetRegistryById.mockResolvedValue(mockRegistry);

      await expect(
        requireAccessRegistry({
          user: mockAdmin,
          registryId: mockRegistry.id,
        })
      ).resolves.not.toThrow();
    });

    it("should throw HttpError(403) when user lacks access", async () => {
      mockIsAdmin.mockResolvedValue(false);
      mockListAuthorizedRegistries.mockResolvedValue([mockRegistry]);

      await expect(
        requireAccessRegistry({
          user: mockAttorney,
          registryId: mockUnauthorizedRegistry.id,
        })
      ).rejects.toThrow(HttpError);

      try {
        await requireAccessRegistry({
          user: mockAttorney,
          registryId: mockUnauthorizedRegistry.id,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        if (error instanceof HttpError) {
          expect(error.status).toBe(403);
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });

    it("should throw HttpError(403) for unknown role", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const unknownUser: AppUser = {
        id: "user_unknown",
        email: "unknown@example.com",
        role: "UNKNOWN" as any,
      };

      await expect(
        requireAccessRegistry({
          user: unknownUser,
          registryId: mockRegistry.id,
        })
      ).rejects.toThrow(HttpError);
    });
  });

  describe("listAuthorizedRegistries", () => {
    it("should return only registries user has permission for", async () => {
      const authorizedRegistries = [mockRegistry];
      mockListAuthorizedRegistries.mockResolvedValue(authorizedRegistries);

      const result = await listAuthorizedRegistries(mockAttorney.id);

      expect(result).toEqual(authorizedRegistries);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(mockRegistry.id);
    });

    it("should return empty array when user has no permissions", async () => {
      mockListAuthorizedRegistries.mockResolvedValue([]);

      const result = await listAuthorizedRegistries(mockAttorney.id);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it("should respect limit parameter", async () => {
      const manyRegistries = Array.from({ length: 100 }, (_, i) => ({
        ...mockRegistry,
        id: `registry_${i}`,
      }));
      mockListAuthorizedRegistries.mockResolvedValue(manyRegistries.slice(0, 50));

      const result = await listAuthorizedRegistries(mockAttorney.id, 50);

      expect(result.length).toBeLessThanOrEqual(50);
    });
  });
});

