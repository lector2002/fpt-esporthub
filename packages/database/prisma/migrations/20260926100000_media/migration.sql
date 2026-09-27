-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "logoKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "coachProfileId" TEXT,
    "title" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");

-- CreateIndex
CREATE INDEX "Achievement_teamId_idx" ON "Achievement"("teamId");

-- CreateIndex
CREATE INDEX "Achievement_coachProfileId_idx" ON "Achievement"("coachProfileId");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Exactly one owner: a player, a team or a coach listing.
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_one_owner" CHECK (num_nonnulls("userId", "teamId", "coachProfileId") = 1);
