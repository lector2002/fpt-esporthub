import { Injectable, ForbiddenException } from "@nestjs/common";
import { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { gameRanks } from "../lookups/lookup-data";

const WEIGHTS = {
  rank: 0.3,
  role: 0.2,
  schedule: 0.2,
  goals: 0.15,
  communication: 0.1,
  reputation: 0.05,
};

interface ProfileLike {
  game: GameId;
  rankTier: string;
  rankLevel: number | null;
  role: string;
  schedule: string[];
  goals: string[];
  communicationStyles: string[];
  reputationBadge: string;
  verificationStatus: string;
  lookingStatus: string;
  onboardingComplete: boolean;
  bio: string | null;
}

interface TeamLike {
  game: GameId;
  rankMin: string;
  rankMax: string;
  neededRoles: string[];
  schedule: string[];
  goals: string[];
  communicationStyle: string;
  recruitmentOpen: boolean;
}

function getRankSort(game: GameId, tier: string, level: number | null): number {
  const ranks = gameRanks[game.toLowerCase()];
  if (!ranks) return 0;
  const match = ranks.find((r) => r.tier === tier && r.level === level);
  return match?.sort ?? 0;
}

function rankCompatibility(
  game: GameId,
  aTier: string,
  aLevel: number | null,
  bTier: string,
  bLevel: number | null,
): number {
  const aSort = getRankSort(game, aTier, aLevel);
  const bSort = getRankSort(game, bTier, bLevel);
  const maxSort = game === "VALORANT" ? 25 : 31;
  const diff = Math.abs(aSort - bSort);
  const maxDiff = maxSort - 1;
  if (maxDiff === 0) return 1;
  return Math.max(0, 1 - diff / maxDiff);
}

function roleCompatibility(aRole: string, bRoles: string[]): number {
  if (bRoles.length === 0) return 0.5;
  const match = bRoles.some((r) => r.toLowerCase() === aRole.toLowerCase());
  return match ? 1 : 0;
}

function scheduleOverlap(aSchedule: string[], bSchedule: string[]): number {
  if (aSchedule.length === 0 || bSchedule.length === 0) return 0;
  const bSet = new Set(bSchedule.map((s) => s.toLowerCase()));
  const overlap = aSchedule.filter((s) => bSet.has(s.toLowerCase())).length;
  const maxLen = Math.max(aSchedule.length, bSchedule.length);
  return maxLen === 0 ? 0 : overlap / maxLen;
}

function goalOverlap(aGoals: string[], bGoals: string[]): number {
  if (aGoals.length === 0 || bGoals.length === 0) return 0;
  const bSet = new Set(bGoals.map((g) => g.toLowerCase()));
  const overlap = aGoals.filter((g) => bSet.has(g.toLowerCase())).length;
  const maxLen = Math.max(aGoals.length, bGoals.length);
  return maxLen === 0 ? 0 : overlap / maxLen;
}

function communicationCompatibility(
  aStyles: string[],
  bStyles: string[],
): number {
  if (aStyles.length === 0 || bStyles.length === 0) return 0;
  const bSet = new Set(bStyles.map((s) => s.toLowerCase()));
  const overlap = aStyles.filter((s) => bSet.has(s.toLowerCase())).length;
  return overlap > 0 ? 1 : 0;
}

function reputationScore(badge: string, verification: string): number {
  let score = 0;
  switch (badge) {
    case "TRUSTED":
      score = 1;
      break;
    case "VERIFIED":
      score = 0.8;
      break;
    case "CAUTION":
      score = 0.2;
      break;
    default:
      score = 0.4;
  }
  if (verification === "VERIFIED") score = Math.min(1, score + 0.2);
  return score;
}

function buildReasons(scores: {
  rank: number;
  role: number;
  schedule: number;
  goals: number;
  communication: number;
  reputation: number;
}): string[] {
  const reasons: string[] = [];
  if (scores.rank >= 0.7) reasons.push("Similar rank");
  if (scores.role >= 0.9) reasons.push("Role matches what team needs");
  if (scores.schedule >= 0.5) reasons.push("Overlapping schedule");
  if (scores.goals >= 0.5) reasons.push("Shared goals");
  if (scores.communication >= 0.9)
    reasons.push("Compatible communication style");
  if (scores.reputation >= 0.8) reasons.push("High reputation");
  if (reasons.length === 0) reasons.push("Potential match");
  return reasons.slice(0, 3);
}

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  async findMatches(userId: string, mode: "find_players" | "find_teams") {
    const callerProfile = await this.prisma.playerProfile.findUnique({
      where: { userId },
      include: { user: { select: { updatedAt: true } } },
    });

    if (!callerProfile || !callerProfile.onboardingComplete) {
      throw new ForbiddenException("Complete onboarding before matching");
    }

    const blockedByMe = await this.prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedIds = new Set(blockedByMe.map((b) => b.blockedId));

    const blockedMe = await this.prisma.block.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });
    for (const b of blockedMe) blockedIds.add(b.blockerId);

    const matchPayload = mode === "find_players"
      ? await this.findPlayers(callerProfile as ProfileLike, blockedIds, userId)
      : await this.findTeams(callerProfile as ProfileLike, blockedIds);

    const pendingSent = await this.prisma.matchRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      include: {
        receiver: { select: { displayName: true } },
        team: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const acceptedCount = await this.prisma.matchRequest.count({
      where: { senderId: userId, status: "ACCEPTED" },
    });

    const averageScore = matchPayload.matches.length
      ? Math.round(matchPayload.matches.reduce((sum, match) => sum + match.score, 0) / matchPayload.matches.length)
      : 0;

    return {
      ...matchPayload,
      profile: {
        game: callerProfile.game === "VALORANT" ? "Valorant" : "League of Legends",
        rank: callerProfile.rankLevel ? `${callerProfile.rankTier} ${callerProfile.rankLevel}` : callerProfile.rankTier,
        role: callerProfile.role,
        schedule: callerProfile.schedule[0] ?? "Flexible",
        updatedLabel: "Cập nhật gần đây",
      },
      stats: {
        totalSuggestions: matchPayload.matches.length,
        averageScore,
        pendingSent: pendingSent.length,
        accepted: acceptedCount,
      },
      pendingRequests: pendingSent.map((request) => ({
        id: request.id,
        name: request.receiver?.displayName ?? request.team?.name ?? "Đối tượng",
        avatarEmoji: "⚡",
        sentAtLabel: "Đang chờ phản hồi",
        statusLabel: "Chờ",
      })),
      tips: [
        { label: "Đã verify Email FPT (+10% score)", state: "done" },
        {
          label: callerProfile.verificationStatus === "VERIFIED" ? "Đã verify Riot ID (+15% score)" : "Đang chờ verify Riot ID (+15% score)",
          state: callerProfile.verificationStatus === "VERIFIED" ? "done" : "pending",
        },
        {
          label: "Cập nhật chi tiết lịch chơi (+5% score)",
          state: callerProfile.schedule.length >= 2 ? "done" : "todo",
        },
      ],
    };
  }

  private async findPlayers(
    caller: ProfileLike,
    blockedIds: Set<string>,
    callerId: string,
  ) {
    const profiles = await this.prisma.playerProfile.findMany({
      where: {
        onboardingComplete: true,
        lookingStatus: "open_to_match",
        game: caller.game,
        userId: { notIn: [...blockedIds, callerId] },
      },
      include: {
        user: { select: { id: true, displayName: true } },
      },
    });

    const scored = profiles.map((p) => {
      const profile = p as unknown as ProfileLike & { user: { id: string; displayName: string } };
      const scores = {
        rank: rankCompatibility(
          caller.game,
          caller.rankTier,
          caller.rankLevel,
          profile.rankTier,
          profile.rankLevel,
        ),
        role: roleCompatibility(profile.role, [caller.role]),
        schedule: scheduleOverlap(caller.schedule, profile.schedule),
        goals: goalOverlap(caller.goals, profile.goals),
        communication: communicationCompatibility(
          caller.communicationStyles,
          profile.communicationStyles,
        ),
        reputation: reputationScore(
          profile.reputationBadge,
          profile.verificationStatus,
        ),
      };

      const total =
        scores.rank * WEIGHTS.rank +
        scores.role * WEIGHTS.role +
        scores.schedule * WEIGHTS.schedule +
        scores.goals * WEIGHTS.goals +
        scores.communication * WEIGHTS.communication +
        scores.reputation * WEIGHTS.reputation;

      return {
        type: "player" as const,
        id: profile.user.id,
        displayName: profile.user.displayName,
        game: profile.game,
        rankTier: profile.rankTier,
        rankLevel: profile.rankLevel,
          role: profile.role,
          schedule: profile.schedule[0] ?? "See profile",
          bio: profile.bio,
          reputationBadge: profile.reputationBadge,
          verificationStatus: profile.verificationStatus,
          score: Math.round(total * 100),
          reasons: buildReasons(scores),
          cautionMessage: profile.reputationBadge === "CAUTION" ? "Tài khoản có lịch sử report, hãy thận trọng." : undefined,
        };
    });

    scored.sort((a, b) => b.score - a.score);
    return { matches: scored };
  }

  private async findTeams(caller: ProfileLike, blockedIds: Set<string>) {
    const teams = await this.prisma.team.findMany({
      where: {
        game: caller.game,
        recruitmentOpen: true,
        captainId: { notIn: [...blockedIds] },
      },
      include: {
        captain: { select: { id: true, displayName: true } },
        _count: { select: { members: true } },
      },
    });

    const scored = teams.map((t) => {
      const team = t as unknown as TeamLike & {
        id: string;
        name: string;
        captain: { id: string; displayName: string };
        _count: { members: number };
      };
      const rankScore = (() => {
        const game = caller.game;
        const callerSort = getRankSort(game, caller.rankTier, caller.rankLevel);
        const minSort = getRankSort(game, team.rankMin, null);
        const maxSort = getRankSort(game, team.rankMax, null);
        if (callerSort >= minSort && callerSort <= maxSort) return 1;
        const dist =
          callerSort < minSort
            ? minSort - callerSort
            : callerSort - maxSort;
        const maxSortVal = game === "VALORANT" ? 25 : 31;
        return Math.max(0, 1 - dist / maxSortVal);
      })();

      const scores = {
        rank: rankScore,
        role: roleCompatibility(caller.role, team.neededRoles),
        schedule: scheduleOverlap(caller.schedule, team.schedule),
        goals: goalOverlap(caller.goals, team.goals),
        communication: communicationCompatibility(
          caller.communicationStyles,
          [team.communicationStyle],
        ),
        reputation: 0.5,
      };

      const total =
        scores.rank * WEIGHTS.rank +
        scores.role * WEIGHTS.role +
        scores.schedule * WEIGHTS.schedule +
        scores.goals * WEIGHTS.goals +
        scores.communication * WEIGHTS.communication +
        scores.reputation * WEIGHTS.reputation;

      return {
        type: "team" as const,
        id: team.id,
        name: team.name,
        captainName: team.captain.displayName,
        game: team.game,
        rankMin: team.rankMin,
        rankMax: team.rankMax,
        neededRoles: team.neededRoles,
        memberCount: team._count.members,
        schedule: team.schedule[0] ?? "See team profile",
        description: `${team._count.members}/5 thành viên · Captain ${team.captain.displayName}`,
        score: Math.round(total * 100),
        reasons: buildReasons(scores),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return { matches: scored };
  }
}
