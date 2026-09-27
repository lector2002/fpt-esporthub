-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "riotPuuid" TEXT,
ADD COLUMN     "verifyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verifyIconId" INTEGER;

-- CreateTable
CREATE TABLE "GameStats" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameStats_profileId_key" ON "GameStats"("profileId");

-- AddForeignKey
ALTER TABLE "GameStats" ADD CONSTRAINT "GameStats_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

