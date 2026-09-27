import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertCanInteract } from "../../common/account";
import { RealtimeService, conversationRoom, userRoom } from "../realtime/realtime.service";
import { hasBlockWith, isBlockedByAny } from "./block-check";

const DEFAULT_PAGE_SIZE = 30;

const participantUserSelect = { id: true, displayName: true, reputationBadge: true, avatarKey: true } as const;

/** Relations needed to describe a conversation to one of its participants. */
const conversationHeadInclude = {
  participants: { include: { user: { select: participantUserSelect } } },
  matchRequest: { select: { id: true, type: true, team: { select: { name: true } } } },
  team: { select: { id: true, name: true, logoKey: true } },
  channel: { select: { id: true, name: true, communityId: true } },
} as const;

const messageSelect = { id: true, conversationId: true, senderId: true, content: true, createdAt: true } as const;

type ConversationHead = {
  id: string;
  updatedAt: Date;
  participants: { userId: string; user: { id: string; displayName: string; reputationBadge: string } }[];
  matchRequest: { id: string; type: string; team: { name: string } | null } | null;
  team: { id: string; name: string; logoKey: string | null } | null;
  channel: { id: string; name: string; communityId: string } | null;
};

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  async findAll(userId: string) {
    // Community channels live on the community page, not in the inbox.
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId, conversation: { channelId: null } },
      include: {
        conversation: {
          include: {
            ...conversationHeadInclude,
            messages: { orderBy: { createdAt: "desc" }, take: 1, select: messageSelect },
          },
        },
      },
    });
    const unread = await this.countUnread(userId, memberships);

    const conversations = memberships.map(({ conversation }) => {
      const last = conversation.messages[0] ?? null;
      return {
        ...describeHead(conversation, userId),
        lastMessage: last ? { content: last.content, senderId: last.senderId, createdAt: last.createdAt } : null,
        unreadCount: unread.get(conversation.id) ?? 0,
      };
    });
    conversations.sort((a, b) => activityTime(b) - activityTime(a));
    return { conversations };
  }

  async findOne(conversationId: string, userId: string, page: { before?: string; limit?: number }) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationHeadInclude,
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    assertParticipant(conversation, userId);

    const limit = page.limit ?? DEFAULT_PAGE_SIZE;
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(page.before ? { cursor: { id: page.before }, skip: 1 } : {}),
      take: limit + 1,
      select: messageSelect,
    });
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse();
    const otherIds = conversation.participants.map((p) => p.userId).filter((id) => id !== userId);
    // Team rooms and community channels stay usable around a block; the client hides blocked members' messages instead.
    const blockedByOther = isGroup(conversation) ? false : await isBlockedByAny(this.prisma, userId, otherIds);

    return { conversation: { ...describeHead(conversation, userId), blockedByOther }, messages, hasMore };
  }

  async sendMessage(conversationId: string, userId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { userId: true } } },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    assertParticipant(conversation, userId);
    await assertCanInteract(this.prisma, userId);

    const recipientIds = conversation.participants.map((p) => p.userId).filter((id) => id !== userId);
    if (!isGroup(conversation)) await this.assertNotBlocked(userId, recipientIds);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderId: userId, content },
        select: messageSelect,
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: created.createdAt } });
      return created;
    });

    // Channels only reach whoever has them open: they are not in the inbox and have no unread badge.
    if (conversation.channelId) {
      this.realtime.emitToConversation(conversationId, "message:new", { conversationId, message });
      return { message };
    }
    const rooms = [conversationRoom(conversationId), ...conversation.participants.map((p) => userRoom(p.userId))];
    this.realtime.emitToRooms(rooms, "message:new", { conversationId, message });
    for (const recipientId of recipientIds) {
      this.realtime.emitToUser(recipientId, "counts:changed", { conversationId });
    }
    return { message };
  }

  async markRead(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { id: true, conversation: { select: { channelId: true } } },
    });
    if (!membership) {
      const exists = await this.prisma.conversation.count({ where: { id: conversationId } });
      if (!exists) throw new NotFoundException("Conversation not found");
      throw new ForbiddenException("You are not a participant in this conversation");
    }

    const lastReadAt = new Date();
    await this.prisma.conversationParticipant.update({ where: { id: membership.id }, data: { lastReadAt } });
    // Channels have no inbox badge to refresh.
    if (!membership.conversation.channelId) this.realtime.emitToUser(userId, "counts:changed", { conversationId });
    return { conversationId, lastReadAt };
  }

  /** Unread = messages from others after the member's lastReadAt (all of them if never read). Same rule as /profiles/me/counts. */
  private async countUnread(userId: string, memberships: { conversationId: string; lastReadAt: Date | null }[]) {
    if (memberships.length === 0) return new Map<string, number>();
    const groups = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        senderId: { not: userId },
        OR: memberships.map((m) => ({
          conversationId: m.conversationId,
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        })),
      },
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [g.conversationId, g._count._all]));
  }

  private async assertNotBlocked(userId: string, otherIds: string[]) {
    if (await hasBlockWith(this.prisma, userId, otherIds)) throw new ForbiddenException("You can't message this user");
  }
}

function assertParticipant(conversation: { participants: { userId: string }[] }, userId: string) {
  if (!conversation.participants.some((p) => p.userId === userId)) {
    throw new ForbiddenException("You are not a participant in this conversation");
  }
}

/** Team rooms and community channels: many members, no "other side". */
const isGroup = (conversation: { teamId?: string | null; channelId?: string | null; team?: unknown; channel?: unknown }) =>
  Boolean(conversation.teamId || conversation.channelId || conversation.team || conversation.channel);

/** Request threads resolve the other side server-side (null if nobody else is left); team rooms name the team instead. */
function describeHead(conversation: ConversationHead, userId: string) {
  const request = conversation.matchRequest;
  const other = isGroup(conversation) ? null : (conversation.participants.find((p) => p.userId !== userId)?.user ?? null);
  return {
    id: conversation.id,
    otherParticipant: other,
    matchRequest: request ? { id: request.id, type: request.type, teamName: request.team?.name ?? null } : null,
    team: conversation.team ? { ...conversation.team, members: conversation.participants.map((p) => p.user) } : null,
    channel: conversation.channel,
    updatedAt: conversation.updatedAt,
  };
}

function activityTime(item: { updatedAt: Date; lastMessage: { createdAt: Date } | null }) {
  return Math.max(item.updatedAt.getTime(), item.lastMessage?.createdAt.getTime() ?? 0);
}
