-- CreateTable
CREATE TABLE "TeamCommissionPayout" (
    "id" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "tradeId" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamCommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamCommissionPayout_beneficiaryUserId_idx" ON "TeamCommissionPayout"("beneficiaryUserId");

-- CreateIndex
CREATE INDEX "TeamCommissionPayout_beneficiaryUserId_executedAt_idx" ON "TeamCommissionPayout"("beneficiaryUserId", "executedAt");

-- CreateIndex
CREATE INDEX "TeamCommissionPayout_sourceUserId_idx" ON "TeamCommissionPayout"("sourceUserId");

-- CreateIndex
CREATE INDEX "TeamCommissionPayout_generation_idx" ON "TeamCommissionPayout"("generation");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- AddForeignKey
ALTER TABLE "TeamCommissionPayout" ADD CONSTRAINT "TeamCommissionPayout_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCommissionPayout" ADD CONSTRAINT "TeamCommissionPayout_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
