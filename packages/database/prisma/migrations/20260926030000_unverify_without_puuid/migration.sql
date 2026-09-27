-- A VERIFIED status must be backed by a Riot puuid from the icon challenge.
UPDATE "PlayerProfile" SET "verificationStatus" = 'SELF_REPORTED' WHERE "verificationStatus" = 'VERIFIED' AND "riotPuuid" IS NULL;
