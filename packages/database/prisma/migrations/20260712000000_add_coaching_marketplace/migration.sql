-- CreateEnum
CREATE TYPE "CoachingRequestStatus" AS ENUM ('PENDING', 'COUNTERED', 'AGREED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" "GameId" NOT NULL,
    "specialties" TEXT[],
    "hourlyRate" INTEGER NOT NULL,
    "bio" TEXT NOT NULL,
    "availability" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingRequest" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "proposedStartAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "proposedPrice" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CoachingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "lastProposedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");
CREATE INDEX "CoachProfile_game_active_idx" ON "CoachProfile"("game", "active");
CREATE INDEX "CoachingRequest_coachId_status_idx" ON "CoachingRequest"("coachId", "status");
CREATE INDEX "CoachingRequest_playerId_status_idx" ON "CoachingRequest"("playerId", "status");

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachingRequest" ADD CONSTRAINT "CoachingRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachingRequest" ADD CONSTRAINT "CoachingRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachingRequest" ADD CONSTRAINT "CoachingRequest_lastProposedById_fkey" FOREIGN KEY ("lastProposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
