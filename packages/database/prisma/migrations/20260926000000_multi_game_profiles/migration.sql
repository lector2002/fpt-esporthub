-- DropIndex
DROP INDEX "PlayerProfile_userId_key";

-- AlterTable
ALTER TABLE "PlayerProfile" DROP COLUMN "reputationBadge";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "reputationBadge" "ReputationBadge" NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "PlayerProfile_game_onboardingComplete_lookingStatus_idx" ON "PlayerProfile"("game", "onboardingComplete", "lookingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_game_key" ON "PlayerProfile"("userId", "game");

