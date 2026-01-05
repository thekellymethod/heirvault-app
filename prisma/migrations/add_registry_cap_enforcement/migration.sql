-- Migration: Add registry cap enforcement fields and registries table
-- This enables the "5 active registries included" billing model
-- Works with existing TEXT-based ID schema

-- Add fields to organizations table for registry cap enforcement
ALTER TABLE "organizations" 
ADD COLUMN IF NOT EXISTS "created_by_clerk_user_id" TEXT,
ADD COLUMN IF NOT EXISTS "included_active_registries" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS "stripe_subscription_status" TEXT NOT NULL DEFAULT 'none';

-- Update existing organizations to have default values
UPDATE "organizations" 
SET 
  "included_active_registries" = COALESCE("included_active_registries", 5),
  "stripe_subscription_status" = COALESCE("stripe_subscription_status", COALESCE("billing_status", 'none'))
WHERE "included_active_registries" IS NULL OR "stripe_subscription_status" IS NULL;

-- Create registries table for policy registries per estate
CREATE TABLE IF NOT EXISTS "registries" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "org_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'archived')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMP(3)
);

-- Create index for efficient active registry counting
CREATE INDEX IF NOT EXISTS "registries_org_status_idx" ON "registries"("org_id", "status");

-- Create index for archived_at queries
CREATE INDEX IF NOT EXISTS "registries_archived_at_idx" ON "registries"("archived_at") WHERE "archived_at" IS NOT NULL;

-- Add clerk_user_id to org_members if not already present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'org_members' AND column_name = 'clerk_user_id'
  ) THEN
    -- Add clerk_user_id column
    ALTER TABLE "org_members" ADD COLUMN "clerk_user_id" TEXT;
    
    -- Try to populate from user.clerkId if user_id exists
    UPDATE "org_members" om
    SET "clerk_user_id" = u."clerkId"
    FROM "users" u
    WHERE om."user_id" = u."id" AND om."clerk_user_id" IS NULL;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE "registries" IS 'Policy registries per estate. Enforces 5 active registries included in base plan.';
COMMENT ON COLUMN "organizations"."included_active_registries" IS 'Number of active registries included in base plan (default: 5)';
COMMENT ON COLUMN "organizations"."stripe_subscription_status" IS 'Stripe subscription status: none, active, trialing, past_due, canceled, etc.';
COMMENT ON COLUMN "org_members"."clerk_user_id" IS 'Clerk user ID for direct authentication lookup (in addition to user_id)';
