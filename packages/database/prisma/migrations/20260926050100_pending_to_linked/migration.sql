-- Started challenges already hold a puuid: keep them as linked accounts (separate migration: a new enum value is usable only after commit).
UPDATE "PlayerProfile" SET "verificationStatus" = 'LINKED' WHERE "verificationStatus" = 'PENDING' AND "riotPuuid" IS NOT NULL;
