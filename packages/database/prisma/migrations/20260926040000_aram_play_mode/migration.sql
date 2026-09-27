-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "playModes" TEXT[] DEFAULT ARRAY['ranked']::TEXT[];

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'ranked';

