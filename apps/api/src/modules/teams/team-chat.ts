import type { PrismaService } from "../prisma/prisma.service";

/** PrismaService or a transaction client. */
type ChatDb = Pick<PrismaService, "conversation" | "conversationParticipant">;

/**
 * A team's room chat is a Conversation keyed by teamId whose participants mirror TeamMember.
 * Conversation access is participant based, so every membership change must go through these two.
 */
export async function joinTeamChat(db: ChatDb, teamId: string, userId: string) {
  const conversation = await db.conversation.upsert({ where: { teamId }, create: { teamId }, update: {}, select: { id: true } });
  await db.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId } },
    // Earlier history is not unread for someone who just joined.
    create: { conversationId: conversation.id, userId, lastReadAt: new Date() },
    update: {},
  });
}

export async function leaveTeamChat(db: ChatDb, teamId: string, userId: string) {
  await db.conversationParticipant.deleteMany({ where: { userId, conversation: { teamId } } });
}
