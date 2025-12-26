/*
  Warnings:

  - You are about to drop the column `createdAt` on the `attorney_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `beneficiaries` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `beneficiaries` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `beneficiaries` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `beneficiaries` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `client_invites` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `insurers` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `invites` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `org_members` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `policies` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `policy_beneficiaries` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `attorneyClientAccess` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `first_name` to the `beneficiaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `beneficiaries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `clients` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attorneyClientAccess" DROP CONSTRAINT "attorneyClientAccess_attorney_id_fkey";

-- DropForeignKey
ALTER TABLE "attorneyClientAccess" DROP CONSTRAINT "attorneyClientAccess_client_id_fkey";

-- DropForeignKey
ALTER TABLE "attorneyClientAccess" DROP CONSTRAINT "attorneyClientAccess_organization_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_createdAt_idx";

-- DropIndex
DROP INDEX "beneficiaries_firstName_lastName_dateOfBirth_idx";

-- DropIndex
DROP INDEX "clients_firstName_lastName_dateOfBirth_idx";

-- DropIndex
DROP INDEX "documents_createdAt_idx";

-- DropIndex
DROP INDEX "users_firstName_lastName_idx";

-- AlterTable
ALTER TABLE "attorney_profiles" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "beneficiaries" DROP COLUMN "createdAt",
DROP COLUMN "dateOfBirth",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "client_invites" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "createdAt",
DROP COLUMN "dateOfBirth",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "insurers" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "invites" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "org_members" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "policies" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "policy_beneficiaries" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT;

-- DropTable
DROP TABLE "attorneyClientAccess";

-- CreateTable
CREATE TABLE "attorney_client_access" (
    "id" TEXT NOT NULL,
    "attorney_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "attorney_client_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attorney_client_access_attorney_id_client_id_key" ON "attorney_client_access"("attorney_id", "client_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "beneficiaries_first_name_last_name_date_of_birth_idx" ON "beneficiaries"("first_name", "last_name", "date_of_birth");

-- CreateIndex
CREATE INDEX "clients_first_name_last_name_date_of_birth_idx" ON "clients"("first_name", "last_name", "date_of_birth");

-- CreateIndex
CREATE INDEX "documents_created_at_idx" ON "documents"("created_at");

-- CreateIndex
CREATE INDEX "users_first_name_last_name_idx" ON "users"("first_name", "last_name");

-- AddForeignKey
ALTER TABLE "attorney_client_access" ADD CONSTRAINT "attorney_client_access_attorney_id_fkey" FOREIGN KEY ("attorney_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_client_access" ADD CONSTRAINT "attorney_client_access_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attorney_client_access" ADD CONSTRAINT "attorney_client_access_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
