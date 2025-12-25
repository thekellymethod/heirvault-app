-- Drop existing audit_logs table if it exists (development only)
DROP TABLE IF EXISTS "audit_logs";

-- Alter enum AuditAction
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
CREATE TYPE "AuditAction" AS ENUM ('CLIENT_CREATED', 'CLIENT_UPDATED', 'POLICY_CREATED', 'POLICY_UPDATED', 'BENEFICIARY_CREATED', 'BENEFICIARY_UPDATED', 'INVITE_CREATED', 'INVITE_ACCEPTED');
DROP TYPE "AuditAction_old";

-- Create enum OrgRole
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ATTORNEY', 'STAFF');

-- Alter table org_members to use OrgRole
ALTER TABLE "org_members" ALTER COLUMN "role" TYPE "OrgRole" USING CASE 
  WHEN "role" = 'owner' THEN 'OWNER'::"OrgRole"
  WHEN "role" = 'admin' THEN 'OWNER'::"OrgRole"
  WHEN "role" = 'member' THEN 'ATTORNEY'::"OrgRole"
  ELSE 'ATTORNEY'::"OrgRole"
END;
ALTER TABLE "org_members" ALTER COLUMN "role" SET DEFAULT 'ATTORNEY'::"OrgRole";
ALTER TABLE "org_members" ALTER COLUMN "role" SET NOT NULL;

-- Add org_id to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "org_id" TEXT;
CREATE INDEX IF NOT EXISTS "clients_org_id_idx" ON "clients"("org_id");
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create new audit_logs table
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "org_id" TEXT,
    "client_id" TEXT,
    "policy_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_org_id_idx" ON "audit_logs"("org_id");
CREATE INDEX "audit_logs_client_id_idx" ON "audit_logs"("client_id");
CREATE INDEX "audit_logs_policy_id_idx" ON "audit_logs"("policy_id");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Add foreign keys
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

