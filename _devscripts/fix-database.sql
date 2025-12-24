-- Fix: Add unique constraint on users.clerkId if it doesn't exist
-- This is required for the ON CONFLICT clause in getCurrentUser() to work

-- Check if the constraint already exists, and create it if not
CREATE UNIQUE INDEX IF NOT EXISTS "users_clerkId_key" ON "users"("clerkId");

-- Verify the constraint was created
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
    AND indexname = 'users_clerkId_key';

