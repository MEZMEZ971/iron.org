-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TransactionRecordType" AS ENUM ('ADMIN_REWARD', 'ADMIN_DEDUCTION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionRecordStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransactionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionRecordType" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "status" "TransactionRecordStatus" NOT NULL DEFAULT 'SUCCESS',
    "description" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TransactionRecord_userId_idx" ON "TransactionRecord"("userId");
CREATE INDEX IF NOT EXISTS "TransactionRecord_userId_createdAt_idx" ON "TransactionRecord"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TransactionRecord_type_idx" ON "TransactionRecord"("type");

DO $$ BEGIN
  ALTER TABLE "TransactionRecord" ADD CONSTRAINT "TransactionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
