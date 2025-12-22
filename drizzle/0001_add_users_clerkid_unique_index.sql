-- Migration: Add unique constraint on users.clerkId
-- This is required for the ON CONFLICT clause in getCurrentUser() to work

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerkId_key" ON "users"("clerkId");

