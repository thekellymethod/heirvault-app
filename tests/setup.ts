/**
 * Test setup file
 * 
 * Configures test environment, mocks, and utilities
 */

import { vi } from "vitest";

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key";
process.env.HEIRVAULT_TOKEN_SECRET = process.env.HEIRVAULT_TOKEN_SECRET || "test-token-secret";
process.env.ADMIN_EMAILS = process.env.ADMIN_EMAILS || "admin@test.com";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "test-resend-key";
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "test@test.com";

// Mock Next.js modules
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Clerk (can be overridden in individual tests)
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({
    userId: "test_user_123",
    sessionId: "test_session_123",
  }),
  currentUser: vi.fn().mockResolvedValue({
    id: "test_user_123",
    emailAddresses: [{ emailAddress: "test@example.com" }],
    publicMetadata: { role: "ATTORNEY" },
    privateMetadata: {},
  }),
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        id: "test_user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        publicMetadata: { role: "ATTORNEY" },
      }),
    },
  },
}));

// Suppress console errors in tests (unless needed for debugging)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};

