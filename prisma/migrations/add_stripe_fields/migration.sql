-- Add Stripe subscription fields to organizations
-- This migration adds fields for per-firm subscription management

-- Add subscription fields
ALTER TABLE "organizations" 
ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT,
ADD COLUMN IF NOT EXISTS "subscription_status" TEXT,
ADD COLUMN IF NOT EXISTS "current_period_end" TIMESTAMP;

-- Create stripe_events table for webhook idempotency
CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "stripe_events_type_idx" ON "stripe_events"("type");
CREATE INDEX IF NOT EXISTS "stripe_events_created_at_idx" ON "stripe_events"("created_at");

-- Update existing organizations to have INACTIVE status if no subscription
UPDATE "organizations" 
SET "subscription_status" = 'INACTIVE'
WHERE "subscription_status" IS NULL AND "stripe_subscription_id" IS NULL;

