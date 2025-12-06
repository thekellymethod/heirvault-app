-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_SUMMARY_PDF_DOWNLOADED';

-- DropIndex
DROP INDEX "clients_org_id_idx";
