-- Onboarding questionnaire: player-level answers on User, per-game answers on PlayerProfile.
ALTER TABLE "User" ADD COLUMN "ageRange" TEXT, ADD COLUMN "campus" TEXT;
ALTER TABLE "PlayerProfile" ADD COLUMN "voiceChat" TEXT, ADD COLUMN "lossReaction" TEXT, ADD COLUMN "mains" TEXT[] DEFAULT ARRAY[]::TEXT[], ADD COLUMN "questionnaireAt" TIMESTAMP(3);
