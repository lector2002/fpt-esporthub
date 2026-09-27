-- AlterTable
ALTER TABLE "User" ADD COLUMN     "premiumUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BuildGuide" (
    "id" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "patch" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "winRate" DOUBLE PRECISION,
    "pickRate" DOUBLE PRECISION,
    "banRate" DOUBLE PRECISION,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuildGuide_position_idx" ON "BuildGuide"("position");

-- CreateIndex
CREATE UNIQUE INDEX "BuildGuide_champion_position_source_key" ON "BuildGuide"("champion", "position", "source");

