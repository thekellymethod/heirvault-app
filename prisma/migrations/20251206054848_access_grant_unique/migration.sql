-- CreateEnum
CREATE TYPE "AccessGrantStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "access_grants" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "org_id" TEXT,
    "attorney_user_id" TEXT,
    "status" "AccessGrantStatus" NOT NULL,
    "granted_by_user_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_grants_client_id_idx" ON "access_grants"("client_id");

-- CreateIndex
CREATE INDEX "access_grants_org_id_idx" ON "access_grants"("org_id");

-- CreateIndex
CREATE INDEX "access_grants_attorney_user_id_idx" ON "access_grants"("attorney_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_grants_client_id_org_id_key" ON "access_grants"("client_id", "org_id");

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_attorney_user_id_fkey" FOREIGN KEY ("attorney_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
