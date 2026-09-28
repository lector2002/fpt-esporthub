-- AlterEnum
ALTER TYPE "CreditTxKind" ADD VALUE 'REWARD';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "checkInStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCheckInDay" DATE,
ADD COLUMN     "lockedCredits" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "lockedAfter" INTEGER NOT NULL DEFAULT 0;

-- Reward credits are a part of the balance, never more than it.
ALTER TABLE "User" ADD CONSTRAINT "User_lockedCredits_within_balance" CHECK ("lockedCredits" >= 0 AND "lockedCredits" <= "creditBalance");
