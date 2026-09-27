-- CreateEnum
CREATE TYPE "CoachReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "CoachProfile" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewStatus" "CoachReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CoachProfile_reviewStatus_idx" ON "CoachProfile"("reviewStatus");


-- Listings created before review existed stay listed.
UPDATE "CoachProfile" SET "reviewStatus" = 'APPROVED', "reviewedAt" = NOW();
