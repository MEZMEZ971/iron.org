-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BalanceLedgerKind" AS ENUM ('ADMIN_CREDIT', 'ADMIN_DEBIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BalanceLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "BalanceLedgerKind" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "balanceAfter" DECIMAL(18,6) NOT NULL,
    "note" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BalanceLedgerEntry_userId_idx" ON "BalanceLedgerEntry"("userId");
CREATE INDEX IF NOT EXISTS "BalanceLedgerEntry_userId_createdAt_idx" ON "BalanceLedgerEntry"("userId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "BalanceLedgerEntry" ADD CONSTRAINT "BalanceLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
