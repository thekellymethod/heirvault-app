-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'POLICY_SEARCH_PERFORMED';
ALTER TYPE "AuditAction" ADD VALUE 'GLOBAL_POLICY_SEARCH_PERFORMED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_PROCESSED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bar_number" TEXT;

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "policy_id" TEXT,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_via" TEXT,
    "extracted_data" JSONB,
    "ocr_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_client_id_idx" ON "documents"("client_id");

-- CreateIndex
CREATE INDEX "documents_policy_id_idx" ON "documents"("policy_id");

-- CreateIndex
CREATE INDEX "documents_created_at_idx" ON "documents"("created_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
