import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";
import { PAGE_SIZE } from "../admin/dto/admin-query.dto";
import { PrismaService } from "../prisma/prisma.service";

const PERSON = { id: true, displayName: true, avatarKey: true } as const;
const MEMBER_LIMIT = 100;

/** Communities for the admin console: owner, members, and how busy each channel is. */
@Injectable()
export class AdminCommunitiesService {
  constructor(private prisma: PrismaService) {}

  async list(q: string | undefined, page: number) {
    const search = q?.trim();
    const where: Prisma.CommunityWhereInput = search ? { name: { contains: search, mode: "insensitive" } } : {};
    const [rows, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        select: { id: true, name: true, game: true, iconKey: true, createdAt: true, owner: { select: PERSON }, _count: { select: { members: true, channels: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.community.count({ where }),
    ]);
    const items = rows.map(({ _count, game, ...row }) => ({ ...row, game: game && toGameSlug(game), memberCount: _count.members, channelCount: _count.channels }));
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  async get(id: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        game: true,
        iconKey: true,
        coverKey: true,
        createdAt: true,
        owner: { select: PERSON },
        members: { select: { role: true, createdAt: true, user: { select: { ...PERSON, status: true } } }, orderBy: { createdAt: "desc" }, take: MEMBER_LIMIT },
        channels: {
          select: {
            id: true,
            name: true,
            kind: true,
            conversation: { select: { _count: { select: { messages: true } }, messages: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 } } },
          },
          orderBy: { position: "asc" },
        },
        _count: { select: { members: true } },
      },
    });
    if (!community) throw new NotFoundException("Community not found");
    const { channels, _count, game, ...rest } = community;
    return {
      community: { ...rest, game: game && toGameSlug(game), memberCount: _count.members },
      channels: channels.map(({ conversation, ...channel }) => ({
        ...channel,
        messageCount: conversation?._count.messages ?? 0,
        lastMessageAt: conversation?.messages[0]?.createdAt ?? null,
      })),
      memberLimit: MEMBER_LIMIT,
    };
  }
}
