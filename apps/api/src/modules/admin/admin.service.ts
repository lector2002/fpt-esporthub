import { Injectable, NotFoundException } from "@nestjs/common";
import { toGameSlug } from "../../common/game";
import { PrismaService } from "../prisma/prisma.service";
import { ReputationService } from "../reputation/reputation.service";
import { findModeratableUser } from "./admin-moderation";
import { PAGE_SIZE, type UserStatusValue } from "./dto/admin-query.dto";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  status: true,
  reputationBadge: true,
  avatarKey: true,
  createdAt: true,
  profiles: {
    select: { game: true, rankTier: true, rankLevel: true, role: true, verificationStatus: true },
    orderBy: { createdAt: "asc" },
  },
  _count: { select: { reportsReceived: true, reportsFiled: true } },
} as const;

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private reputationService: ReputationService,
  ) {}

  async getMetrics() {
    const weekAgo = new Date(Date.now() - WEEK_MS);
    const [usersTotal, usersNew7d, profileGroups, teams, openReports, pendingRequests, messages7d] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
        this.prisma.playerProfile.groupBy({
          by: ["game"],
          where: { onboardingComplete: true },
          _count: { _all: true },
        }),
        this.prisma.team.count(),
        this.prisma.report.count({ where: { status: { in: ["PENDING", "REVIEWING"] } } }),
        this.prisma.matchRequest.count({ where: { status: "PENDING" } }),
        this.prisma.message.count({ where: { createdAt: { gte: weekAgo } } }),
      ]);

    const profilesByGame = { valorant: 0, league_of_legends: 0 };
    for (const group of profileGroups) {
      profilesByGame[toGameSlug(group.game)] = group._count._all;
    }

    return { usersTotal, usersNew7d, profilesByGame, teams, openReports, pendingRequests, messages7d };
  }

  async getUsers(q: string | undefined, status: UserStatusValue | undefined, page: number) {
    const search = q?.trim();
    const where = {
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ displayName: contains(search) }, { email: contains(search) }] } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);

    const [points, openReports] = await Promise.all([
      this.prisma.reputationRecord.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((user) => user.id) } },
        _sum: { points: true },
      }),
      this.prisma.report.groupBy({
        by: ["reportedUserId"],
        where: { reportedUserId: { in: users.map((user) => user.id) }, status: { in: ["PENDING", "REVIEWING"] } },
        _count: { _all: true },
      }),
    ]);
    const pointsByUser = new Map(points.map((row) => [row.userId, row._sum.points ?? 0]));
    const openByUser = new Map(openReports.map((row) => [row.reportedUserId, row._count._all]));

    const items = users.map(({ _count, profiles, ...user }) => ({
      ...user,
      profiles: profiles.map((profile) => ({ ...profile, game: toGameSlug(profile.game) })),
      reputationPoints: pointsByUser.get(user.id) ?? 0,
      reportsReceived: _count.reportsReceived,
      openReportsReceived: openByUser.get(user.id) ?? 0,
      reportsFiled: _count.reportsFiled,
    }));
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  async updateUserStatus(actorId: string, userId: string, status: UserStatusValue, note?: string) {
    const user = await findModeratableUser(this.prisma, actorId, userId);
    if (user.status !== status) {
      await this.prisma.user.update({ where: { id: userId }, data: { status } });
    }
    // The schema has no moderation log; the status change and note are kept as a 0-point reputation record.
    const badge = await this.reputationService.recordEvent(
      userId,
      `ADMIN_STATUS_${status}`,
      0,
      note?.trim() || undefined,
    );
    return { user: { id: userId, status, reputationBadge: badge } };
  }

  async getTeams(q: string | undefined, page: number) {
    const search = q?.trim();
    const where = search ? { name: contains(search) } : {};

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        select: {
          id: true,
          name: true,
          game: true,
          rankMin: true,
          rankMax: true,
          recruitmentOpen: true,
          createdAt: true,
          captain: { select: { id: true, displayName: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.team.count({ where }),
    ]);

    const items = teams.map(({ _count, ...team }) => ({
      ...team,
      game: toGameSlug(team.game),
      memberCount: _count.members,
    }));
    return { items, total, page, pageSize: PAGE_SIZE };
  }

  async updateRecruitment(teamId: string, recruitmentOpen: boolean) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) throw new NotFoundException("Team not found");
    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: { recruitmentOpen },
      select: { id: true, recruitmentOpen: true },
    });
    return { team: updated };
  }
}
