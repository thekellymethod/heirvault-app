/**
 * Clerk Test Mode Setup
 * 
 * Configures Clerk for testing with mock authentication
 */

import { vi } from "vitest";

/**
 * Mock Clerk authentication for tests
 * 
 * Usage:
 * ```typescript
 * import { setupClerkTestMode } from './tests/clerk-test-setup';
 * 
 * beforeEach(() => {
 *   setupClerkTestMode({
 *     userId: 'test_user_123',
 *     email: 'test@example.com',
 *     role: 'ATTORNEY',
 *   });
 * });
 * ```
 */
export function setupClerkTestMode(user?: {
  userId?: string;
  email?: string;
  role?: "ATTORNEY" | "ADMIN" | "SYSTEM";
}) {
  const mockUser = {
    userId: user?.userId || "test_user_123",
    email: user?.email || "test@example.com",
    role: user?.role || "ATTORNEY",
  };

  // Mock Clerk auth
  vi.doMock("@clerk/nextjs/server", () => ({
    auth: vi.fn().mockResolvedValue({
      userId: mockUser.userId,
      sessionId: "test_session_123",
    }),
    currentUser: vi.fn().mockResolvedValue({
      id: mockUser.userId,
      emailAddresses: [{ emailAddress: mockUser.email }],
      publicMetadata: { role: mockUser.role },
      privateMetadata: {},
    }),
    clerkClient: {
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: mockUser.userId,
          emailAddresses: [{ emailAddress: mockUser.email }],
          publicMetadata: { role: mockUser.role },
        }),
      },
    },
  }));

  return mockUser;
}

/**
 * Setup Clerk test mode for admin user
 */
export function setupClerkAdminTestMode() {
  return setupClerkTestMode({
    userId: "test_admin_123",
    email: "admin@test.com",
    role: "ADMIN",
  });
}

/**
 * Setup Clerk test mode for attorney user
 */
export function setupClerkAttorneyTestMode() {
  return setupClerkTestMode({
    userId: "test_attorney_123",
    email: "attorney@test.com",
    role: "ATTORNEY",
  });
}

/**
 * Clear Clerk mocks
 */
export function clearClerkMocks() {
  vi.clearAllMocks();
}

