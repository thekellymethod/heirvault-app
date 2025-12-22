-- Add client_versions table for versioned updates
-- This preserves historical chain of client data changes

CREATE TABLE IF NOT EXISTS "client_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "client_id" TEXT NOT NULL,
  "invite_id" TEXT,
  "version_number" INTEGER NOT NULL,
  "previous_version_id" TEXT,
  "client_data" JSONB NOT NULL,
  "policies_data" JSONB,
  "beneficiaries_data" JSONB,
  "changes" JSONB,
  "submitted_by" TEXT,
  "submission_method" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_versions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "client_versions_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "client_invites"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "client_versions_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "client_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "client_versions_client_id_idx" ON "client_versions"("client_id");
CREATE INDEX IF NOT EXISTS "client_versions_invite_id_idx" ON "client_versions"("invite_id");
CREATE INDEX IF NOT EXISTS "client_versions_version_number_idx" ON "client_versions"("version_number");
CREATE INDEX IF NOT EXISTS "client_versions_created_at_idx" ON "client_versions"("created_at");
CREATE INDEX IF NOT EXISTS "client_versions_previous_version_id_idx" ON "client_versions"("previous_version_id");

