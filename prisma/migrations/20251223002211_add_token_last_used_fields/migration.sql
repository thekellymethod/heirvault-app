-- AlterTable
ALTER TABLE "api_tokens" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "lastUsedIp" TEXT,
ADD COLUMN     "lastUsedPath" TEXT;

-- CreateIndex
CREATE INDEX "api_tokens_lastUsedAt_idx" ON "api_tokens"("lastUsedAt");
