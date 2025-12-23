-- DropForeignKey
ALTER TABLE "policies" DROP CONSTRAINT "policies_insurer_id_fkey";

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "carrier_confidence" DOUBLE PRECISION,
ADD COLUMN     "carrier_name_raw" TEXT,
ALTER COLUMN "insurer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
