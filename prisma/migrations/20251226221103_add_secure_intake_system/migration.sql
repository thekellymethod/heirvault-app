-- CreateEnum
CREATE TYPE "ClientInviteStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DocumentSensitivity" AS ENUM ('S1_PUBLIC', 'S2_INTERNAL', 'S3_CONFIDENTIAL', 'S4_HIGHLY_SENSITIVE', 'S5_LEGAL_CASE');

-- CreateEnum
CREATE TYPE "DocumentClassificationStatus" AS ENUM ('PENDING_OCR', 'AUTO_ACCEPTED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BeneficiaryVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISCREPANCY', 'REJECTED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('INVITE_PDF', 'RECEIPT_PDF');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVITE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVITE_PDF_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RECEIPT_PDF_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_CLASSIFIED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_ACCESSED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTAKE_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OCR_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXTRACTION_COMPLETED';

-- AlterTable: client_invites
ALTER TABLE "client_invites" ADD COLUMN IF NOT EXISTS "token_hash" TEXT;
ALTER TABLE "client_invites" ADD COLUMN IF NOT EXISTS "status" "ClientInviteStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "client_invites" ADD COLUMN IF NOT EXISTS "submission_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "client_invites" ADD COLUMN IF NOT EXISTS "max_submissions" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "client_invites" ADD COLUMN IF NOT EXISTS "invite_pdf_artifact_id" TEXT;
ALTER TABLE "client_invites" ADD COLUMN IF NOT EXISTS "receipt_pdf_artifact_id" TEXT;

-- Create unique index on token_hash (after populating it)
-- Note: We'll populate token_hash from existing tokens in a separate step

-- AlterTable: beneficiaries
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "verification_status" "BeneficiaryVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable: documents
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "document_hash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "sensitivity_level" "DocumentSensitivity" NOT NULL DEFAULT 'S1_PUBLIC';
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "contains_gov_id" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "contains_tax_data" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "contains_case_data" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "confidence_score" DOUBLE PRECISION;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "classification_status" "DocumentClassificationStatus" NOT NULL DEFAULT 'PENDING_OCR';

-- CreateTable: document_extractions
CREATE TABLE IF NOT EXISTS "document_extractions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: artifacts
CREATE TABLE IF NOT EXISTS "artifacts" (
    "id" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "client_id" TEXT,
    "invite_id" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: document_access_events
CREATE TABLE IF NOT EXISTS "document_access_events" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT,
    "access_type" TEXT NOT NULL,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "client_invites_token_hash_idx" ON "client_invites"("token_hash");
CREATE INDEX IF NOT EXISTS "client_invites_status_idx" ON "client_invites"("status");
CREATE INDEX IF NOT EXISTS "client_invites_expires_at_idx" ON "client_invites"("expires_at");
CREATE INDEX IF NOT EXISTS "beneficiaries_verification_status_idx" ON "beneficiaries"("verification_status");
CREATE INDEX IF NOT EXISTS "documents_document_hash_idx" ON "documents"("document_hash");
CREATE INDEX IF NOT EXISTS "documents_sensitivity_level_idx" ON "documents"("sensitivity_level");
CREATE INDEX IF NOT EXISTS "documents_classification_status_idx" ON "documents"("classification_status");
CREATE INDEX IF NOT EXISTS "document_extractions_document_id_idx" ON "document_extractions"("document_id");
CREATE INDEX IF NOT EXISTS "document_extractions_entity_type_idx" ON "document_extractions"("entity_type");
CREATE INDEX IF NOT EXISTS "artifacts_type_idx" ON "artifacts"("type");
CREATE INDEX IF NOT EXISTS "artifacts_client_id_idx" ON "artifacts"("client_id");
CREATE INDEX IF NOT EXISTS "artifacts_invite_id_idx" ON "artifacts"("invite_id");
CREATE INDEX IF NOT EXISTS "document_access_events_document_id_idx" ON "document_access_events"("document_id");
CREATE INDEX IF NOT EXISTS "document_access_events_user_id_idx" ON "document_access_events"("user_id");
CREATE INDEX IF NOT EXISTS "document_access_events_created_at_idx" ON "document_access_events"("created_at");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "client_invites" ADD CONSTRAINT "client_invites_invite_pdf_artifact_id_fkey" 
        FOREIGN KEY ("invite_pdf_artifact_id") REFERENCES "artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "client_invites" ADD CONSTRAINT "client_invites_receipt_pdf_artifact_id_fkey" 
        FOREIGN KEY ("receipt_pdf_artifact_id") REFERENCES "artifacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_document_id_fkey" 
        FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_client_id_fkey" 
        FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "document_access_events" ADD CONSTRAINT "document_access_events_document_id_fkey" 
        FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "document_access_events" ADD CONSTRAINT "document_access_events_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Populate token_hash for existing invites (using crypto hash of token)
-- Note: This uses PostgreSQL's digest function. If not available, you may need to hash in application code.
UPDATE "client_invites" 
SET "token_hash" = encode(digest("token", 'sha256'), 'hex')
WHERE "token_hash" IS NULL;

-- Create unique constraint on token_hash after population
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "client_invites_token_hash_key" ON "client_invites"("token_hash");
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Set default document_hash for existing documents (empty string is fine, will be populated on next update)
-- No action needed as we already set DEFAULT ''

