-- Earnings dashboard: rolling 30-day trading proceeds tracker
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monthlyTradingProceeds" DECIMAL(18,6) NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "proceedsPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
