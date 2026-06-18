-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legacyReferralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_legacyReferralCode_key" ON "User"("legacyReferralCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_legacyReferralCode_idx" ON "User"("legacyReferralCode");
