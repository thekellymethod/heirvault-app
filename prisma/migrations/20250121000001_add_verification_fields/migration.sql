-- Add verification status fields to policies and documents
-- This enables document processing and verification workflow

-- Add policy verification status enum
DO $$ BEGIN
  CREATE TYPE "PolicyVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISCREPANCY', 'INCOMPLETE', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add verification fields to policies table
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "verification_status" "PolicyVerificationStatus" DEFAULT 'PENDING';
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "verified_by_user_id" TEXT;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "verification_notes" TEXT;
ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "document_hash" TEXT;

-- Add foreign key for verified_by_user_id
DO $$ BEGIN
  ALTER TABLE "policies" ADD CONSTRAINT "policies_verified_by_user_id_fkey" 
    FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add verification and hash fields to documents table
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "document_hash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "verified_by_user_id" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "verification_notes" TEXT;

-- Add foreign key for verified_by_user_id
DO $$ BEGIN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_user_id_fkey" 
    FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create index on document_hash for fast lookups
CREATE INDEX IF NOT EXISTS "documents_document_hash_idx" ON "documents"("document_hash");

-- Update existing documents to have a hash (if they don't have one)
-- Note: This sets a placeholder - actual hashes should be computed from file content
UPDATE "documents" 
SET "document_hash" = encode(sha256(("id" || "file_name" || "created_at"::text)::bytea), 'hex')
WHERE "document_hash" = '' OR "document_hash" IS NULL;

