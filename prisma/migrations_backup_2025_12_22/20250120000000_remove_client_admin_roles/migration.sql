-- Update all existing users to have attorney role
UPDATE "users" SET "role" = 'attorney' WHERE "role" IN ('client', 'admin');

-- Remove enum values (PostgreSQL doesn't support removing enum values directly)
-- We need to recreate the enum type
-- First, create a new enum with only attorney
CREATE TYPE "UserRole_new" AS ENUM ('attorney');

-- Update the column to use the new enum
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");

-- Drop the old enum and rename the new one
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

