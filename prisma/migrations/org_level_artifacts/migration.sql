-- Add org-level artifacts support for billing invoices
-- This migration adds fields to support organization-level artifacts (billing invoices)

-- Add BILLING_INVOICE_PDF to ArtifactType enum
ALTER TYPE "ArtifactType" ADD VALUE IF NOT EXISTS 'BILLING_INVOICE_PDF';

-- Add orgId to artifacts table
ALTER TABLE "artifacts" 
ADD COLUMN IF NOT EXISTS "org_id" TEXT,
ADD COLUMN IF NOT EXISTS "storage_key" TEXT,
ADD COLUMN IF NOT EXISTS "sha256" TEXT,
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add foreign key relationship to organizations
ALTER TABLE "artifacts"
ADD CONSTRAINT "artifacts_org_id_fkey" 
FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

-- Add indexes for org-level queries
CREATE INDEX IF NOT EXISTS "artifacts_org_id_idx" ON "artifacts"("org_id");
CREATE INDEX IF NOT EXISTS "artifacts_type_created_at_idx" ON "artifacts"("type", "created_at");

-- Add BILLING_INVOICE_OPENED to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BILLING_INVOICE_OPENED';

-- Add stripePriceId and currentPeriodEnd to organizations if not already present
ALTER TABLE "organizations" 
ADD COLUMN IF NOT EXISTS "stripe_price_id" TEXT,
ADD COLUMN IF NOT EXISTS "current_period_end" TIMESTAMP;

