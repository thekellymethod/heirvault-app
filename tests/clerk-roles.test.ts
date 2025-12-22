/**
 * Clerk Roles Enforcement Tests
 * 
 * Verifies that Clerk roles are correctly enforced:
 * - ADMIN_EMAILS environment variable is respected
 * - requireAdmin() checks ADMIN_EMAILS
 * - requireAttorney() enforces attorney role
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin, isAdmin } from "@/lib/admin";
import { requireAttorney } from "@/lib/auth";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { AppUser } from "@/lib/auth";

// Mock Clerk
vi.mock("@clerk/nextjs/server");

describe("Clerk Roles Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env.ADMIN_EMAILS = "admin@example.com,another-admin@example.com";
  });

  describe("isAdmin", () => {
    it("should return true for email in ADMIN_EMAILS", async () => {
      const adminUser: AppUser = {
        id: "user_123",
        email: "admin@example.com",
        role: "ADMIN",
      };

      const result = await isAdmin(adminUser);
      expect(result).toBe(true);
    });

    it("should return false for email not in ADMIN_EMAILS", async () => {
      const regularUser: AppUser = {
        id: "user_456",
        email: "regular@example.com",
        role: "ATTORNEY",
      };

      const result = await isAdmin(regularUser);
      expect(result).toBe(false);
    });

    it("should return false when ADMIN_EMAILS is not set", async () => {
      delete process.env.ADMIN_EMAILS;
      
      const adminUser: AppUser = {
        id: "user_123",
        email: "admin@example.com",
        role: "ADMIN",
      };

      const result = await isAdmin(adminUser);
      expect(result).toBe(false);
    });

    it("should be case-insensitive for email matching", async () => {
      const adminUser: AppUser = {
        id: "user_123",
        email: "ADMIN@EXAMPLE.COM",
        role: "ADMIN",
      };

      const result = await isAdmin(adminUser);
      expect(result).toBe(true);
    });
  });

  describe("requireAdmin", () => {
    it("should not throw for admin user", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);
      vi.mocked(currentUser).mockResolvedValue({
        id: "user_123",
        emailAddresses: [{ emailAddress: "admin@example.com" }],
        publicMetadata: { role: "ADMIN" },
      } as any);

      await expect(requireAdmin()).resolves.not.toThrow();
    });

    it("should throw for non-admin user", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user_456" } as any);
      vi.mocked(currentUser).mockResolvedValue({
        id: "user_456",
        emailAddresses: [{ emailAddress: "regular@example.com" }],
        publicMetadata: { role: "ATTORNEY" },
      } as any);

      await expect(requireAdmin()).rejects.toThrow();
    });
  });

  describe("requireAttorney", () => {
    it("should not throw for attorney user", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as any);
      vi.mocked(currentUser).mockResolvedValue({
        id: "user_123",
        emailAddresses: [{ emailAddress: "attorney@example.com" }],
        publicMetadata: { role: "ATTORNEY" },
      } as any);

      await expect(requireAttorney()).resolves.not.toThrow();
    });

    it("should throw for unauthenticated user", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      await expect(requireAttorney()).rejects.toThrow();
    });
  });
});

