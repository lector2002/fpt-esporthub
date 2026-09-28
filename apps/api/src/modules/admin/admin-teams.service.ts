import { Injectable, NotFoundException } from "@nestjs/common";
import { toGameSlug } from "../../common/game";
import { PrismaService } from "../prisma/prisma.service";

const PERSON = { id: true, displayName: true, avatarKey: true } as const;
const LIST_LIMIT = 30;

@Injectable()
export class AdminTeamsService {
  constructor(private prisma: PrismaService) {}

  /** One team for the admin: roster, join requests and invites, cups entered, chat size and reports against it. */
  async getTeam(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        game: true,
        mode: true,
        rankMin: true,
        rankMax: true,
        neededRoles: true,
        schedule: true,
        goals: true,
        communicationStyle: true,
        description: true,
        recruitmentOpen: true,
        logoKey: true,
        featuredUntil: true,
        createdAt: true,
        captain: { select: PERSON },
        members: { select: { role: true, createdAt: true, user: { select: { ...PERSON, status: true } } }, orderBy: { createdAt: "asc" } },
        requests: {
          select: { id: true, type: true, status: true, createdAt: true, sender: { select: PERSON }, receiver: { select: PERSON } },
          orderBy: { createdAt: "desc" },
          take: LIST_LIMIT,
        },
        tournamentEntries: {
          select: { id: true, createdAt: true, tournament: { select: { id: true, title: true, startsAt: true, status: true } } },
          orderBy: { createdAt: "desc" },
        },
        conversation: { select: { _count: { select: { messages: true } } } },
      },
    });
    if (!team) throw new NotFoundException("Team not found");

    const [reports, pendingRequests] = await Promise.all([
      this.prisma.report.findMany({
        where: { targetType: "team", targetId: id },
        select: { id: true, reason: true, status: true, createdAt: true, reporter: { select: PERSON } },
        orderBy: { createdAt: "desc" },
        take: LIST_LIMIT,
      }),
      this.prisma.matchRequest.count({ where: { teamId: id, status: "PENDING" } }),
    ]);

    const { conversation, ...rest } = team;
    return {
      team: { ...rest, game: toGameSlug(team.game), messageCount: conversation?._count.messages ?? 0, pendingRequests },
      reports,
      listLimit: LIST_LIMIT,
    };
  }
}
