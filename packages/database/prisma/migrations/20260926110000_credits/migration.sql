-- CreateEnum
CREATE TYPE "CreditTxKind" AS ENUM ('TOPUP', 'BOOST', 'FEATURE', 'COSMETIC', 'GUIDE', 'COACHING_HOLD', 'COACHING_REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoachingSettlement" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CoachPayoutKind" AS ENUM ('EARNING', 'PAYOUT');

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "payableCredits" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CoachingRequest" ADD COLUMN     "creditHold" INTEGER,
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "settlement" "CoachingSettlement";

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "boostedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "featuredUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "creditBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "kind" "CreditTxKind" NOT NULL,
    "ref" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTopUp" (
    "id" TEXT NOT NULL,
    "orderCode" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "checkoutUrl" TEXT,
    "paymentLinkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "CreditTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachPayoutEntry" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" "CoachPayoutKind" NOT NULL,
    "ref" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachPayoutEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_ref_key" ON "CreditTransaction"("ref");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTopUp_orderCode_key" ON "CreditTopUp"("orderCode");

-- CreateIndex
CREATE INDEX "CreditTopUp_userId_createdAt_idx" ON "CreditTopUp"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoachPayoutEntry_ref_key" ON "CoachPayoutEntry"("ref");

-- CreateIndex
CREATE INDEX "CoachPayoutEntry_coachProfileId_createdAt_idx" ON "CoachPayoutEntry"("coachProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTopUp" ADD CONSTRAINT "CreditTopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachPayoutEntry" ADD CONSTRAINT "CoachPayoutEntry_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Balances never go negative, whatever code path writes them.
ALTER TABLE "User" ADD CONSTRAINT "User_creditBalance_nonnegative" CHECK ("creditBalance" >= 0);
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_payableCredits_nonnegative" CHECK ("payableCredits" >= 0);
ALTER TABLE "CreditTopUp" ADD CONSTRAINT "CreditTopUp_amounts_positive" CHECK ("credits" > 0 AND "amountVnd" > 0);
