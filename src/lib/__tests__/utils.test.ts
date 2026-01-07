/**
 * Unit Tests: Utility Functions
 * Tests for utility functions in lib/utils/
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuthApi, getCurrentUser } from "../utils/clerk";

// Mock Clerk
const mockAuth = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
  currentUser: () => mockCurrentUser(),
}));

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

describe("Utility Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should return null if not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("should return null if Clerk user not available", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" });
      mockCurrentUser.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("should return user if exists in database", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_123" });
      mockCurrentUser.mockResolvedValue({
        id: "clerk_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "John",
        lastName: "Doe",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "db_user_123",
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "attorney",
        barNumber: null,
      });

      const result = await getCurrentUser();

      expect(result).not.toBeNull();
      expect(result?.email).toBe("test@example.com");
      expect(result?.role).toBe("attorney");
    });

    it("should create user if not exists in database", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_new" });
      mockCurrentUser.mockResolvedValue({
        id: "clerk_new",
        emailAddresses: [{ emailAddress: "new@example.com" }],
        firstName: "Jane",
        lastName: "Smith",
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "db_user_new",
        clerkId: "clerk_new",
        email: "new@example.com",
        firstName: "Jane",
        lastName: "Smith",
        role: "attorney",
        barNumber: null,
      });

      const result = await getCurrentUser();

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.email).toBe("new@example.com");
    });

    it("should handle build/prerender gracefully", async () => {
      mockAuth.mockRejectedValue(new Error("Auth not available during build"));

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe("requireAuthApi", () => {
    it("should return user if authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_123" });
      mockCurrentUser.mockResolvedValue({
        id: "clerk_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "db_user_123",
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "attorney",
        barNumber: null,
      });

      const result = await requireAuthApi();

      expect(result.response).toBeUndefined();
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe("test@example.com");
    });

    it("should return 401 response if not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const result = await requireAuthApi();

      expect(result.response).toBeDefined();
      expect(result.response?.status).toBe(401);
      expect(result.user).toBeUndefined();
    });

    it("should return 401 response if user not found", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_123" });
      mockCurrentUser.mockResolvedValue(null);

      const result = await requireAuthApi();

      expect(result.response).toBeDefined();
      expect(result.response?.status).toBe(401);
    });
  });
});
