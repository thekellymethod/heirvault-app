-- Add client fingerprint and address fields for better data separation
-- This prevents conflicts when multiple clients share the same name, DOB, or address

-- Add client fingerprint field (unique hash of identifying information)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "client_fingerprint" TEXT;

-- Add address fields to clients table for better separation
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- Add address fields to beneficiaries table
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "beneficiaries" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- Add address fields to users (attorneys) table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Create unique constraint on email for clients (prevents duplicate emails)
CREATE UNIQUE INDEX IF NOT EXISTS "clients_email_key" ON "clients"("email");

-- Create unique constraint on client_fingerprint (prevents duplicate client records)
CREATE UNIQUE INDEX IF NOT EXISTS "clients_client_fingerprint_key" ON "clients"("client_fingerprint") WHERE "client_fingerprint" IS NOT NULL;

-- Create composite index for client name + DOB searches (helps identify potential duplicates)
CREATE INDEX IF NOT EXISTS "clients_first_name_last_name_date_of_birth_idx" ON "clients"("first_name", "last_name", "date_of_birth");

-- Create composite index for client address searches (helps identify potential duplicates by address)
CREATE INDEX IF NOT EXISTS "clients_address_idx" ON "clients"("address_line1", "city", "state", "postal_code") WHERE "address_line1" IS NOT NULL;

-- Create index for client fingerprint lookups
CREATE INDEX IF NOT EXISTS "clients_client_fingerprint_idx" ON "clients"("client_fingerprint") WHERE "client_fingerprint" IS NOT NULL;

-- Create index for organization separation
CREATE INDEX IF NOT EXISTS "clients_org_id_idx" ON "clients"("org_id") WHERE "org_id" IS NOT NULL;

-- Create composite index for beneficiary name + DOB searches
CREATE INDEX IF NOT EXISTS "beneficiaries_name_dob_idx" ON "beneficiaries"("first_name", "last_name", "date_of_birth");

-- Create composite index for beneficiary address searches
CREATE INDEX IF NOT EXISTS "beneficiaries_address_idx" ON "beneficiaries"("address_line1", "city", "state", "postal_code") WHERE "address_line1" IS NOT NULL;

-- Create index for beneficiary client relationship
CREATE INDEX IF NOT EXISTS "beneficiaries_client_id_idx" ON "beneficiaries"("client_id");

-- Create composite index for attorney name searches
CREATE INDEX IF NOT EXISTS "users_name_idx" ON "users"("first_name", "last_name") WHERE "first_name" IS NOT NULL AND "last_name" IS NOT NULL;

-- Create composite index for attorney address searches
CREATE INDEX IF NOT EXISTS "users_address_idx" ON "users"("address_line1", "city", "state", "postal_code") WHERE "address_line1" IS NOT NULL;

