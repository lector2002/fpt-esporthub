import { Injectable, ForbiddenException } from "@nestjs/common";
import type { GameId, PlayerProfile } from "@fpt-esporthub/database";
import { BOOST_SORT_BONUS, isPromoted } from "../credits/promotion";
import { PrismaService } from "../prisma/prisma.service";
import { findActiveProfile, toGameSlug } from "../../common/game";
import { MAX_TEAM_MEMBERS } from "../match-requests/match-requests.constants";
import type { PlayMode } from "../lookups/lookup-data";
import {
  ARAM_WEIGHTS,
  WEIGHTS,
  buildReasons,
  communicationCompatibility,
  communicationFit,
  goalOverlap,
  rankCompatibility,
  rankRangeCompatibility,
  reputationScore,
  playerRoleFit,
  roleCompatibility,
  sameCampus,
  scheduleOverlap,
  totalScore,
} from "./matching.scoring";
import { loadRequestStates, NO_REQUEST } from "./request-state";
import { EQUIPPED_SELECT, toCosmeticsView } from "../cosmetics/catalog";

export type MatchMode = "find_players" | "find_teams";

/** Restricted and banned accounts are never suggested (they can't reply, or can't sign in). */
const HIDDEN_STATUSES = ["RESTRICTED", "BANNED"] as const;

/** ARAM exists only for LoL; every other game matches in ranked. */
function resolvePlayMode(game: GameId, requested: PlayMode | undefined): PlayMode {
  return game === "LEAGUE_OF_LEGENDS" && requested === "aram" ? "aram" : "ranked";
}

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  async findMatches(userId: string, mode: MatchMode, game: GameId | undefined, requestedPlayMode?: PlayMode) {
    const callerProfile = await findActiveProfile(this.prisma, userId, game);
    if (!callerProfile || !callerProfile.onboardingComplete) {
      throw new ForbiddenException("Complete onboarding before matching");
    }

    const playMode = resolvePlayMode(callerProfile.game, requestedPlayMode);
    const blockedIds = await this.loadBlockedIds(userId);
    const payload =
      mode === "find_players"
        ? await this.findPlayers(callerProfile, blockedIds, userId, playMode)
        : await this.findTeams(callerProfile, blockedIds, userId, playMode);

    const [pendingSent, accepted] = await Promise.all([
      this.prisma.matchRequest.count({ where: { senderId: userId, status: "PENDING" } }),
      this.prisma.matchRequest.count({ where: { senderId: userId, status: "ACCEPTED" } }),
    ]);
    const averageScore = payload.matches.length
      ? Math.round(payload.matches.reduce((sum, match) => sum + match.score, 0) / payload.matches.length)
      : 0;

    return {
      ...payload,
      playMode,
      profile: {
        game: toGameSlug(callerProfile.game),
        rankTier: callerProfile.rankTier,
        rankLevel: callerProfile.rankLevel,
        role: callerProfile.role,
        schedule: callerProfile.schedule,
        playModes: callerProfile.playModes,
        updatedAt: callerProfile.updatedAt,
      },
      stats: { totalSuggestions: payload.matches.length, averageScore, pendingSent, accepted },
    };
  }

  /** Users the caller blocked or who blocked the caller. */
  private async loadBlockedIds(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const b of blocks) ids.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    return ids;
  }

  private async findPlayers(caller: PlayerProfile, blockedIds: Set<string>, callerId: string, playMode: PlayMode) {
    const aram = playMode === "aram";
    const weights = aram ? ARAM_WEIGHTS : WEIGHTS;
    const [callerUser, profiles, states] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: callerId }, select: { ageRange: true, campus: true } }),
      this.prisma.playerProfile.findMany({
        where: {
          onboardingComplete: true,
          lookingStatus: "open_to_match",
          game: caller.game,
          playModes: { has: playMode },
          userId: { notIn: [...blockedIds, callerId] },
          user: { status: { notIn: [...HIDDEN_STATUSES] } },
        },
        include: { user: { select: { id: true, displayName: true, reputationBadge: true, avatarKey: true, coverKey: true, ageRange: true, campus: true, ...EQUIPPED_SELECT } } },
      }),
      loadRequestStates(this.prisma, callerId, "player"),
    ]);
    const callerFit = { styles: caller.communicationStyles, voiceChat: caller.voiceChat, lossReaction: caller.lossReaction, ...fitFromUser(callerUser) };

    const scored = profiles.map((profile) => {
      const scores = {
        rank: aram ? 0 : rankCompatibility(caller.game, caller.rankTier, caller.rankLevel, profile.rankTier, profile.rankLevel),
        role: aram ? 0 : playerRoleFit(caller.role, profile.role),
        schedule: scheduleOverlap(caller.schedule, profile.schedule),
        goals: goalOverlap(caller.goals, profile.goals),
        communication: communicationFit(callerFit, {
          styles: profile.communicationStyles,
          voiceChat: profile.voiceChat,
          lossReaction: profile.lossReaction,
          ...fitFromUser(profile.user),
        }),
        reputation: reputationScore(profile.user.reputationBadge, profile.verificationStatus),
      };
      const campus = sameCampus(callerFit.campus, profile.user.campus);
      return {
        type: "player" as const,
        id: profile.user.id,
        displayName: profile.user.displayName,
        avatarKey: profile.user.avatarKey,
        coverKey: profile.user.coverKey,
        cosmetics: toCosmeticsView(profile.user),
        game: toGameSlug(profile.game),
        rankTier: profile.rankTier,
        rankLevel: profile.rankLevel,
        role: profile.role,
        schedule: profile.schedule,
        playModes: profile.playModes,
        mains: profile.mains,
        recentChampion: profile.recentChampion,
        bio: profile.bio,
        reputationBadge: profile.user.reputationBadge,
        verificationStatus: profile.verificationStatus,
        boosted: isPromoted(profile.boostedUntil),
        score: totalScore(scores, weights),
        reasons: buildReasons(scores, weights, campus ? ["same_campus"] : []),
        ...(states.get(profile.user.id) ?? NO_REQUEST),
      };
    });

    scored.sort((a, b) => promotedScore(b) - promotedScore(a));
    return { matches: scored };
  }

  private async findTeams(caller: PlayerProfile, blockedIds: Set<string>, callerId: string, playMode: PlayMode) {
    const aram = playMode === "aram";
    const weights = aram ? ARAM_WEIGHTS : WEIGHTS;
    const [teams, states] = await Promise.all([
      this.prisma.team.findMany({
        where: {
          game: caller.game,
          mode: playMode,
          recruitmentOpen: true,
          captainId: { notIn: [...blockedIds, callerId] },
          captain: { status: { notIn: [...HIDDEN_STATUSES] } },
          members: { none: { userId: callerId } },
        },
        include: {
          captain: { select: { id: true, displayName: true } },
          _count: { select: { members: true } },
        },
      }),
      loadRequestStates(this.prisma, callerId, "team"),
    ]);

    const maxMembers = MAX_TEAM_MEMBERS[caller.game];
    const scored = teams
      .filter((team) => team._count.members < maxMembers)
      .map((team) => {
        const scores = {
          rank: aram ? 0 : rankRangeCompatibility(caller.game, caller.rankTier, caller.rankLevel, team.rankMin, team.rankMax),
          role: aram ? 0 : roleCompatibility(caller.role, team.neededRoles, true),
          schedule: scheduleOverlap(caller.schedule, team.schedule),
          goals: goalOverlap(caller.goals, team.goals),
          communication: communicationCompatibility(caller.communicationStyles, [team.communicationStyle]),
          reputation: 0.5,
        };
        return {
          type: "team" as const,
          id: team.id,
          name: team.name,
          logoKey: team.logoKey,
          coverKey: team.coverKey,
          captainId: team.captain.id,
          captainName: team.captain.displayName,
          game: toGameSlug(team.game),
          mode: team.mode,
          rankMin: team.rankMin,
          rankMax: team.rankMax,
          neededRoles: team.neededRoles,
          memberCount: team._count.members,
          maxMembers,
          schedule: team.schedule,
          description: team.description,
          featured: isPromoted(team.featuredUntil),
          score: totalScore(scores, weights),
          reasons: buildReasons(scores, weights),
          ...(states.get(team.id) ?? NO_REQUEST),
        };
      });

    scored.sort((a, b) => promotedScore(b) - promotedScore(a));
    return { matches: scored };
  }
}

function fitFromUser(user: { ageRange: string | null; campus: string | null } | null) {
  return { ageRange: user?.ageRange ?? null, campus: user?.campus ?? null };
}

/** Paid boosts move a result up without changing the score users see. */
function promotedScore(match: { score: number; boosted?: boolean; featured?: boolean }) {
  return match.score + (match.boosted || match.featured ? BOOST_SORT_BONUS : 0);
}
