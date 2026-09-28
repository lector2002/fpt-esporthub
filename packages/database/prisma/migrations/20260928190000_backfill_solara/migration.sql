-- Users who paid a top-up before the first top-up gift existed get the Solara pet now, equipped when they wear no pet.
WITH gifted AS (
  INSERT INTO "UserCosmetic" ("id", "userId", "itemId", "createdAt")
  SELECT gen_random_uuid()::text, paid."userId", 'pet_solara', NOW()
  FROM (SELECT DISTINCT "userId" FROM "CreditTopUp" WHERE "status" = 'PAID') AS paid
  ON CONFLICT ("userId", "itemId") DO NOTHING
  RETURNING "userId"
)
UPDATE "User" SET "petId" = 'pet_solara', "updatedAt" = NOW()
WHERE "id" IN (SELECT "userId" FROM gifted) AND "petId" IS NULL;
