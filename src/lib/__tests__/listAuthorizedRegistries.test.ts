/**
 * Unit Tests: listAuthorizedRegistries Function
 * 
 * Tests the database query logic for listing authorized registries
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { listAuthorizedRegistries } from "../db";
import { supabaseServer } from "../supabase";

// Mock Supabase
vi.mock("../supabase", () => ({
  supabaseServer: vi.fn(),
}));

describe("listAuthorizedRegistries", () => {
  const mockUserId = "user_123";
  const mockSupabaseClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseServer).mockReturnValue(mockSupabaseClient as any);
  });

  it("should query registry_permissions table with correct user_id", async () => {
    const mockData = [
      {
        registry_records: {
          id: "registry_1",
          status: "PENDING" as const,
          decedentName: "John Doe",
          createdAt: new Date(),
        },
      },
    ];

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockData,
      error: null,
    });

    await listAuthorizedRegistries(mockUserId);

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("registry_permissions");
    expect(mockSupabaseClient.select).toHaveBeenCalledWith("registry_records(*)");
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith("user_id", mockUserId);
    expect(mockSupabaseClient.order).toHaveBeenCalledWith(
      "registry_records.createdAt",
      { ascending: false }
    );
  });

  it("should return empty array when no permissions exist", async () => {
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await listAuthorizedRegistries(mockUserId);

    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it("should throw error when Supabase query fails", async () => {
    const mockError = new Error("Database error");
    mockSupabaseClient.limit.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(listAuthorizedRegistries(mockUserId)).rejects.toThrow("Database error");
  });

  it("should respect limit parameter", async () => {
    const limit = 10;
    mockSupabaseClient.limit.mockResolvedValue({
      data: [],
      error: null,
    });

    await listAuthorizedRegistries(mockUserId, limit);

    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(limit);
  });

  it("should map Supabase response correctly", async () => {
    const mockData = [
      {
        registry_records: {
          id: "registry_1",
          status: "PENDING" as const,
          decedentName: "John Doe",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        },
      },
      {
        registry_records: {
          id: "registry_2",
          status: "PENDING" as const,
          decedentName: "Jane Smith",
          createdAt: new Date("2024-01-02T00:00:00Z"),
        },
      },
    ];

    mockSupabaseClient.limit.mockResolvedValue({
      data: mockData,
      error: null,
    });

    const result = await listAuthorizedRegistries(mockUserId);

    expect(result.length).toBe(2);
    expect(result[0].id).toBe("registry_1");
    expect(result[1].id).toBe("registry_2");
    expect(result[0].decedentName).toBe("John Doe");
    expect(result[1].decedentName).toBe("Jane Smith");
  });
});

