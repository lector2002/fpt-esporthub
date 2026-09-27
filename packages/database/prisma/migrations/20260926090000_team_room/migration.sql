-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "teamId" TEXT,
ALTER COLUMN "matchRequestId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_teamId_key" ON "Conversation"("teamId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing team gets its room chat; members start as read so nothing shows as unread.
INSERT INTO "Conversation" ("id", "teamId", "createdAt", "updatedAt")
SELECT 'team_' || "id", "id", NOW(), NOW() FROM "Team";

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "lastReadAt", "createdAt")
SELECT 'teammember_' || "id", 'team_' || "teamId", "userId", NOW(), NOW() FROM "TeamMember";
