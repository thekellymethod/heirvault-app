-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "slug" TEXT;
ALTER TABLE "organizations" ADD COLUMN "address_line1" TEXT;
ALTER TABLE "organizations" ADD COLUMN "address_line2" TEXT;
ALTER TABLE "organizations" ADD COLUMN "city" TEXT;
ALTER TABLE "organizations" ADD COLUMN "state" TEXT;
ALTER TABLE "organizations" ADD COLUMN "postal_code" TEXT;
ALTER TABLE "organizations" ADD COLUMN "country" TEXT;
ALTER TABLE "organizations" ADD COLUMN "phone" TEXT;
ALTER TABLE "organizations" ADD COLUMN "logo_url" TEXT;

-- Generate slugs for existing organizations (simple slug from name)
UPDATE "organizations" 
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'))
WHERE "slug" IS NULL;

-- Make slug unique and required
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");

