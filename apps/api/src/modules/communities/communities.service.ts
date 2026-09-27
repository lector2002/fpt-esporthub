import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { assertCanInteract } from "../../common/account";
import { parseGame } from "../../common/game";
import { MediaStorage } from "../media/media-storage";
import { PrismaService } from "../prisma/prisma.service";
import { CallService } from "../realtime/call.service";
import { RealtimeService } from "../realtime/realtime.service";
import { blockedUserIds } from "../teams/team-view";
import { createChannel, joinCommunityChat, leaveCommunityChat } from "./community-chat";
import { communitySummaryInclude, toCommunitySummary } from "./community-view";
import type { CreateChannelDto } from "./dto/create-channel.dto";
import type { CreateCommunityDto } from "./dto/create-community.dto";
import type { UpdateCommunityDto } from "./dto/update-community.dto";

export const MAX_OWNED_COMMUNITIES = 5;
export const MAX_CHANNELS = 20;
const LIST_LIMIT = 60;
const MEMBER_LIST_LIMIT = 500;

/** Starter layout for a new community, like Discord's default server. */
const DEFAULT_CHANNELS = [
  { name: "chung", kind: "TEXT" },
  { name: "tìm-đồng-đội", kind: "TEXT" },
  { name: "Sảnh chờ", kind: "VOICE" },
  { name: "Leo rank", kind: "VOICE" },
] as const;

export interface CommunityListFilter {
  game?: string;
  q?: string;
}

@Injectable()
export class CommunitiesService {
  constructor(
    private prisma: PrismaService,
    private calls: CallService,
    private realtime: RealtimeService,
    private storage: MediaStorage,
  ) {}

  /** Discover: biggest first. A game filter keeps communities open to every game. */
  async findAll(viewerId: string, filter: CommunityListFilter) {
    const game = parseGame(filter.game);
    const q = filter.q?.trim();
    const blocked = await blockedUserIds(this.prisma, viewerId);
    const communities = await this.prisma.community.findMany({
      where: {
        ownerId: { notIn: blocked },
        ...(game ? { OR: [{ game }, { game: null }] } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: communitySummaryInclude(viewerId),
      orderBy: [{ members: { _count: "desc" } }, { createdAt: "desc" }],
      take: LIST_LIMIT,
    });
    return { communities: communities.map((community) => this.summary(community)) };
  }

  /** The viewer's communities, in the order they joined: the server rail. */
  async findMine(viewerId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId: viewerId },
      orderBy: { createdAt: "asc" },
      include: { community: { include: communitySummaryInclude(viewerId) } },
    });
    return { communities: memberships.map(({ community }) => this.summary(community)) };
  }

  /** Anyone can preview channels and members; only members get the chat conversation ids. */
  async findOne(communityId: string, viewerId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: communitySummaryInclude(viewerId),
    });
    if (!community) throw new NotFoundException("Community not found");
    const blocked = await blockedUserIds(this.prisma, viewerId);
    if (blocked.includes(community.ownerId)) throw new NotFoundException("Community not found");

    const isMember = community.members.length > 0;
    const [channels, members] = await Promise.all([
      this.prisma.communityChannel.findMany({
        where: { communityId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { conversation: { select: { id: true } } },
      }),
      this.prisma.communityMember.findMany({
        where: { communityId },
        orderBy: { createdAt: "asc" },
        take: MEMBER_LIST_LIMIT,
        include: { user: { select: { id: true, displayName: true, avatarKey: true, reputationBadge: true } } },
      }),
    ]);

    return {
      community: {
        ...this.summary(community),
        channels: channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          kind: channel.kind === "TEXT" ? "text" : "voice",
          conversationId: isMember ? (channel.conversation?.id ?? null) : null,
        })),
        members: members.map((member) => ({
          userId: member.userId,
          displayName: member.user.displayName,
          avatarKey: member.user.avatarKey,
          reputationBadge: member.user.reputationBadge,
          role: member.role,
          online: this.realtime.isOnline(member.userId),
          joinedAt: member.createdAt,
        })),
      },
    };
  }

  async create(ownerId: string, dto: CreateCommunityDto) {
    await assertCanInteract(this.prisma, ownerId);
    const owned = await this.prisma.community.count({ where: { ownerId } });
    if (owned >= MAX_OWNED_COMMUNITIES) throw new ConflictException(`You can own at most ${MAX_OWNED_COMMUNITIES} communities`);

    const community = await this.prisma.$transaction(async (tx) => {
      const created = await tx.community.create({
        data: { ownerId, name: cleanName(dto.name), description: cleanDescription(dto.description), game: gameOf(dto.game) ?? null },
      });
      await tx.communityMember.create({ data: { communityId: created.id, userId: ownerId, role: "owner" } });
      for (const [position, channel] of DEFAULT_CHANNELS.entries()) {
        await createChannel(tx, { communityId: created.id, ...channel, position, memberIds: [ownerId] });
      }
      return created;
    });
    return this.findOne(community.id, ownerId);
  }

  async update(communityId: string, userId: string, dto: UpdateCommunityDto) {
    await this.requireOwner(communityId, userId);
    const game = gameOf(dto.game);
    await this.prisma.community.update({
      where: { id: communityId },
      data: {
        ...(dto.name !== undefined ? { name: cleanName(dto.name) } : {}),
        ...(dto.description !== undefined ? { description: cleanDescription(dto.description) } : {}),
        ...(game !== undefined ? { game } : {}),
      },
    });
    return this.findOne(communityId, userId);
  }

  async remove(communityId: string, userId: string) {
    const community = await this.requireOwner(communityId, userId);
    const voice = await this.voiceChannelIds(communityId);
    await this.prisma.community.delete({ where: { id: communityId } });
    for (const id of voice) this.calls.closeRoom(id);
    await Promise.all([community.iconKey, community.coverKey].map((key) => this.storage.remove(key)));
    return { success: true };
  }

  async join(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { ownerId: true } });
    if (!community) throw new NotFoundException("Community not found");
    const blocked = await blockedUserIds(this.prisma, userId);
    if (blocked.includes(community.ownerId)) throw new NotFoundException("Community not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.communityMember.upsert({
        where: { communityId_userId: { communityId, userId } },
        create: { communityId, userId },
        update: {},
      });
      await joinCommunityChat(tx, communityId, userId);
    });
    return this.findOne(communityId, userId);
  }

  async leave(communityId: string, userId: string) {
    const membership = await this.prisma.communityMember.findUnique({ where: { communityId_userId: { communityId, userId } } });
    if (!membership) throw new NotFoundException("You are not a member of this community");
    if (membership.role === "owner") throw new ConflictException("The owner can't leave. Delete the community instead.");

    await this.prisma.$transaction(async (tx) => {
      await tx.communityMember.delete({ where: { id: membership.id } });
      await leaveCommunityChat(tx, communityId, userId);
    });
    for (const id of await this.voiceChannelIds(communityId)) this.calls.removeFromRoom(id, userId);
    return { success: true };
  }

  async addChannel(communityId: string, userId: string, dto: CreateChannelDto) {
    await this.requireOwner(communityId, userId);
    const kind = dto.kind === "text" ? "TEXT" : "VOICE";
    const name = cleanChannelName(dto.name, kind);
    await this.prisma.$transaction(async (tx) => {
      const [count, last, members] = await Promise.all([
        tx.communityChannel.count({ where: { communityId } }),
        tx.communityChannel.findFirst({ where: { communityId }, orderBy: { position: "desc" }, select: { position: true } }),
        tx.communityMember.findMany({ where: { communityId }, select: { userId: true } }),
      ]);
      if (count >= MAX_CHANNELS) throw new ConflictException(`A community can have at most ${MAX_CHANNELS} channels`);
      await createChannel(tx, {
        communityId,
        name,
        kind,
        position: (last?.position ?? -1) + 1,
        memberIds: members.map((member) => member.userId),
      });
    });
    return this.findOne(communityId, userId);
  }

  async removeChannel(communityId: string, userId: string, channelId: string) {
    await this.requireOwner(communityId, userId);
    const channel = await this.prisma.communityChannel.findFirst({ where: { id: channelId, communityId } });
    if (!channel) throw new NotFoundException("Channel not found");
    if (channel.kind === "TEXT") {
      const texts = await this.prisma.communityChannel.count({ where: { communityId, kind: "TEXT" } });
      if (texts <= 1) throw new ConflictException("A community needs at least one text channel");
    }
    await this.prisma.communityChannel.delete({ where: { id: channelId } });
    if (channel.kind === "VOICE") this.calls.closeRoom(channelId);
    return this.findOne(communityId, userId);
  }

  private summary(community: Parameters<typeof toCommunitySummary>[0]) {
    return toCommunitySummary(community, this.calls.occupancy(community.channels.map((channel) => channel.id)));
  }

  private async voiceChannelIds(communityId: string) {
    const channels = await this.prisma.communityChannel.findMany({ where: { communityId, kind: "VOICE" }, select: { id: true } });
    return channels.map((channel) => channel.id);
  }

  private async requireOwner(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException("Community not found");
    if (community.ownerId !== userId) throw new ForbiddenException("Only the community owner can do this");
    return community;
  }
}

/** "any" clears the game; undefined leaves it alone. */
function gameOf(value: string | undefined) {
  if (value === undefined) return undefined;
  return value === "any" ? null : (parseGame(value) ?? null);
}

function cleanName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 40) throw new BadRequestException("Community name must be 3-40 characters");
  return trimmed;
}

function cleanDescription(description: string | undefined) {
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

/** Text channels read like Discord's: lowercase, dashes for spaces. Voice channels keep their spelling. */
function cleanChannelName(name: string, kind: "TEXT" | "VOICE") {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const cleaned = kind === "TEXT" ? trimmed.toLowerCase().replace(/[\s#]+/g, "-").replace(/^-+|-+$/g, "") : trimmed;
  if (cleaned.length < 1 || cleaned.length > 32) throw new BadRequestException("Channel name must be 1-32 characters");
  return cleaned;
}
