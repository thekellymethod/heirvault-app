-- Add processing state fields to documents table
-- This migration adds fields for idempotent document processing

-- Add enum if it doesn't exist (PostgreSQL)
DO $$ BEGIN
    CREATE TYPE "ProcessingState" AS ENUM ('QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add processing fields to documents
ALTER TABLE "documents" 
ADD COLUMN IF NOT EXISTS "processing_state" "ProcessingState" DEFAULT 'QUEUED',
ADD COLUMN IF NOT EXISTS "processing_locked_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "processing_attempts" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_processing_error" TEXT,
ADD COLUMN IF NOT EXISTS "extracted_json_key" TEXT,
ADD COLUMN IF NOT EXISTS "redacted_preview_key" TEXT;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS "documents_processing_state_idx" ON "documents"("processing_state", "processing_locked_at");

-- Set existing PENDING_OCR documents to QUEUED
UPDATE "documents" 
SET "processing_state" = 'QUEUED' 
WHERE "classification_status" = 'PENDING_OCR' AND "processing_state" IS NULL;

