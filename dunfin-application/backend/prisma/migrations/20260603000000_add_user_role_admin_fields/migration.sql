-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'PARTNER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "WithdrawalRecord" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
