-- Affiliate cache columns + composite indexes for balance / ledger queries
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cachedActiveTeamCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cachedFundedDownlineCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "affiliateStatsUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Deposit_userId_createdAt_idx" ON "Deposit"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "WithdrawalRecord_userId_status_idx" ON "WithdrawalRecord"("userId", "status");
