/**
 * Canonical AppUser type
 * This is the single source of truth for the AppUser type across the codebase
 */
export type AppUser = {
  id: string;
  clerkId: string;
  roles: string[];
  email?: string | null;
};
