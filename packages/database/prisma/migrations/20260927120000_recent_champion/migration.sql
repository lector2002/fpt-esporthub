-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "recentChampion" TEXT;

-- Backfill from the latest synced match
UPDATE "PlayerProfile" AS p
SET "recentChampion" = s."data"->'matches'->0->>'championName'
FROM "GameStats" AS s
WHERE s."profileId" = p."id" AND s."data"->'matches'->0->>'championName' IS NOT NULL;

UPDATE "PlayerProfile" SET "recentChampion" = 'Fiddlesticks' WHERE "recentChampion" = 'FiddleSticks';
