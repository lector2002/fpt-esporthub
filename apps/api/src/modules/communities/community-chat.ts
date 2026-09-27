import type { PrismaService } from "../prisma/prisma.service";

/** PrismaService or a transaction client. */
type ChatDb = Pick<PrismaService, "conversation" | "conversationParticipant" | "communityChannel">;

/**
 * Every text channel is a Conversation keyed by channelId whose participants mirror CommunityMember.
 * Conversation access is participant based, so every membership or channel change must go through these.
 */
export async function joinCommunityChat(db: ChatDb, communityId: string, userId: string) {
  const conversations = await db.conversation.findMany({ where: { channel: { communityId } }, select: { id: true } });
  // Earlier history is not unread for someone who just joined.
  const lastReadAt = new Date();
  await db.conversationParticipant.createMany({
    data: conversations.map(({ id }) => ({ conversationId: id, userId, lastReadAt })),
    skipDuplicates: true,
  });
}

export async function leaveCommunityChat(db: ChatDb, communityId: string, userId: string) {
  await db.conversationParticipant.deleteMany({ where: { userId, conversation: { channel: { communityId } } } });
}

/** A new channel; text channels get their conversation with every current member in it. */
export function createChannel(
  db: ChatDb,
  input: { communityId: string; name: string; kind: "TEXT" | "VOICE"; position: number; memberIds: string[] },
) {
  const lastReadAt = new Date();
  const { memberIds, ...channel } = input;
  return db.communityChannel.create({
    data: {
      ...channel,
      ...(channel.kind === "TEXT"
        ? { conversation: { create: { participants: { createMany: { data: memberIds.map((userId) => ({ userId, lastReadAt })) } } } } }
        : {}),
    },
    select: { id: true },
  });
}
