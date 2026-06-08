-- AlterEnum
ALTER TYPE "TransactionRecordType" ADD VALUE 'LUCKY_WHEEL_REWARD';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSpinDate" TIMESTAMP(3),
ADD COLUMN     "customTokenBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
