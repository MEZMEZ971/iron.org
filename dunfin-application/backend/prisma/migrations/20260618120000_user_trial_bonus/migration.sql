-- 3-day $100 welcome trial fields (may already exist from db push)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialBalance" DECIMAL(18,6) NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isTrialActive" BOOLEAN NOT NULL DEFAULT false;

ALTER TYPE "TransactionRecordType" ADD VALUE 'TRIAL_WELCOME_BONUS';
