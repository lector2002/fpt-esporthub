-- AlterTable
ALTER TABLE "MatchRequest" ADD COLUMN     "game" "GameId";


-- Backfill: team requests take the team's game; player requests take a game both users play.
UPDATE "MatchRequest" mr SET "game" = t."game" FROM "Team" t WHERE mr."teamId" = t."id" AND mr."game" IS NULL;
UPDATE "MatchRequest" mr SET "game" = s."game"
FROM "PlayerProfile" s JOIN "PlayerProfile" r ON r."game" = s."game"
WHERE mr."game" IS NULL AND s."userId" = mr."senderId" AND r."userId" = mr."receiverId";
