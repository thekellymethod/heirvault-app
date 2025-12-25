-- Add registry-first tables
-- Registry records, versions, and access logs

-- Create enums
CREATE TYPE "RegistryStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED');
CREATE TYPE "RegistrySubmissionSource" AS ENUM ('SYSTEM', 'ATTORNEY', 'INTAKE');
CREATE TYPE "AccessLogAction" AS ENUM ('VIEWED', 'CREATED', 'UPDATED', 'VERIFIED', 'ARCHIVED', 'EXPORTED', 'DELETED');

-- Registry records table - main registry table (registry-first design)
CREATE TABLE "registry_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "decedentName" TEXT NOT NULL,
  "status" "RegistryStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "registry_records_decedentName_idx" ON "registry_records" ("decedentName");
CREATE INDEX "registry_records_status_idx" ON "registry_records" ("status");
CREATE INDEX "registry_records_createdAt_idx" ON "registry_records" ("createdAt");

-- Registry versions table - immutable versioned data (nothing updates in place)
CREATE TABLE "registry_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "registry_id" UUID NOT NULL REFERENCES "registry_records" ("id") ON DELETE CASCADE,
  "data_json" JSONB NOT NULL,
  "submitted_by" "RegistrySubmissionSource" NOT NULL,
  "hash" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "registry_versions_registry_id_idx" ON "registry_versions" ("registry_id");
CREATE INDEX "registry_versions_hash_idx" ON "registry_versions" ("hash");
CREATE INDEX "registry_versions_createdAt_idx" ON "registry_versions" ("createdAt");
CREATE INDEX "registry_versions_submitted_by_idx" ON "registry_versions" ("submitted_by");

-- Access logs table - audit trail for registry access
CREATE TABLE "access_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "registry_id" UUID NOT NULL REFERENCES "registry_records" ("id") ON DELETE CASCADE,
  "user_id" UUID REFERENCES "users" ("id") ON DELETE SET NULL,
  "action" "AccessLogAction" NOT NULL,
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "access_logs_registry_id_idx" ON "access_logs" ("registry_id");
CREATE INDEX "access_logs_user_id_idx" ON "access_logs" ("user_id");
CREATE INDEX "access_logs_timestamp_idx" ON "access_logs" ("timestamp");
CREATE INDEX "access_logs_action_idx" ON "access_logs" ("action");

-- Add registry_version_id to documents table
ALTER TABLE "documents" ADD COLUMN "registry_version_id" UUID REFERENCES "registry_versions" ("id") ON DELETE SET NULL;
CREATE INDEX "documents_registry_version_id_idx" ON "documents" ("registry_version_id");

