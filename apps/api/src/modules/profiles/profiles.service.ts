import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import type { GameId, PlayerProfile } from "@fpt-esporthub/database";
import { listAchievements } from "../media/achievement-view";
import { PrismaService } from "../prisma/prisma.service";
import { MatchingService } from "../matching/matching.service";
import { isRiotLinked } from "../riot/riot-profile";
import { RiotService } from "../riot/riot.service";
import { OnboardingDto } from "./dto/onboarding.dto";
import type { QuestionnaireDto } from "./dto/questionnaire.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { toCosmeticsView } from "../cosmetics/catalog";
import { GAME_MAP, findActiveProfile, toGameSlug } from "../../common/game";
import {
  DEFAULT_PLAY_MODES,
  FILL_ROLE,
  UNRANKED_TIER,
  gameRanks,
  gameRoles,
  isAramOnly,
  supportsAram,
} from "../lookups/lookup-data";

function formatRank(rankTier: string, rankLevel: number | null) {
  return rankLevel ? `${rankTier} ${rankLevel}` : rankTier;
}

/** LoL keeps the requested modes; Valorant (and a missing value) falls back to ["ranked"]. */
function resolvePlayModes(gameSlug: string, requested: string[] | undefined) {
  return requested && supportsAram(gameSlug) ? requested : DEFAULT_PLAY_MODES;
}

/** The dashboard's daily matches use ranked when the profile plays it, else ARAM. */
function primaryPlayMode(profile: PlayerProfile) {
  return profile.playModes.includes("ranked") ? "ranked" : "aram";
}

/** Readiness checks keyed by a stable id; the client owns the labels and the fix-it links. ARAM-only skips rank. */
function buildReadiness(profile: PlayerProfile) {
  // Valorant verification needs Riot Sign-On (not available yet), so a Riot ID on file counts as done.
  const riotDone =
    profile.game === "VALORANT" ? Boolean(profile.riotId) : isRiotLinked(profile) && Boolean(profile.riotId);
  const checks = [
    { id: "bio", complete: Boolean(profile.bio) },
    { id: "rank", complete: Boolean(profile.rankTier && profile.role) },
    { id: "schedule", complete: profile.schedule.length > 0 },
    { id: "goals", complete: profile.goals.length > 0 },
    { id: "communication", complete: profile.communicationStyles.length > 0 },
    { id: "riot", complete: riotDone },
    { id: "questionnaire", complete: profile.questionnaireAt !== null },
  ].filter((check) => check.id !== "rank" || !isAramOnly(profile.playModes));
  const percent = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100);
  return { percent, checks };
}

/** Fields of a game profile that anyone signed in may see. Riot ID only once linked to a real account. */
function toPublicGameProfile(profile: PlayerProfile) {
  return {
    id: profile.id,
    game: toGameSlug(profile.game),
    rankTier: profile.rankTier,
    rankLevel: profile.rankLevel,
    role: profile.role,
    schedule: profile.schedule,
    goals: profile.goals,
    communicationStyles: profile.communicationStyles,
    playModes: profile.playModes,
    voiceChat: profile.voiceChat,
    lossReaction: profile.lossReaction,
    mains: profile.mains,
    recentChampion: profile.recentChampion,
    verificationStatus: profile.verificationStatus,
    riotId: isRiotLinked(profile) ? profile.riotId : null,
    bio: profile.bio,
    lookingStatus: profile.lookingStatus,
  };
}

@Injectable()
export class ProfilesService {
  constructor(
    private prisma: PrismaService,
    private matching: MatchingService,
    private riot: RiotService,
  ) {}

  async saveOnboarding(userId: string, dto: OnboardingDto) {
    const game = GAME_MAP[dto.game];
    if (!game) {
      throw new NotFoundException(`Unknown game: ${dto.game}`);
    }

    const playModes = resolvePlayModes(dto.game, dto.playModes);
    const aramOnly = isAramOnly(playModes);
    const data = {
      playModes,
      rankTier: aramOnly ? UNRANKED_TIER : (dto.rankTier ?? UNRANKED_TIER),
      rankLevel: aramOnly ? null : (dto.rankLevel ?? null),
      role: aramOnly ? FILL_ROLE : (findRoleOption(dto.game, dto.role ?? "")?.label ?? dto.role ?? FILL_ROLE),
      schedule: dto.schedule,
      goals: dto.goals,
      communicationStyles: dto.communicationStyles,
      riotId: dto.riotId ?? null,
      onboardingComplete: true,
    };
    const existing = await this.prisma.playerProfile.findUnique({ where: { userId_game: { userId, game } } });
    if (existing && existing.riotId !== data.riotId) await this.riot.resetVerification(existing.id);
    const answers = dto.questionnaire ? questionnaireUpdate(dto.questionnaire) : null;
    const profileData = { ...data, ...answers?.profile };
    const [profile] = await this.prisma.$transaction([
      this.prisma.playerProfile.upsert({
        where: { userId_game: { userId, game } },
        update: profileData,
        create: { userId, game, ...profileData },
      }),
      ...(answers ? [this.prisma.user.update({ where: { id: userId }, data: answers.user })] : []),
    ]);

    return { profile };
  }

  async getMyProfile(userId: string, game: GameId | undefined) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profiles: { orderBy: { createdAt: "asc" } },
        teamMemberships: { include: { team: { include: { _count: { select: { members: true } } } } } },
        captainedTeams: { include: { _count: { select: { members: true } } } },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const profile = (game ? user.profiles.find((item) => item.game === game) : user.profiles[0]) ?? null;
    const teams = [
      ...user.teamMemberships.map((membership) => ({ team: membership.team, role: membership.role === "captain" ? "captain" : "member" })),
      ...user.captainedTeams
        .filter((team) => !user.teamMemberships.some((membership) => membership.team.id === team.id))
        .map((team) => ({ team, role: "captain" })),
    ].map(({ team, role }) => ({
      id: team.id,
      name: team.name,
      game: toGameSlug(team.game),
      role,
      memberCount: team._count.members,
      neededRoles: team.neededRoles,
      recruitmentOpen: team.recruitmentOpen,
    }));

    const profileView = { teams, readiness: profile ? buildReadiness(profile) : null };
    const achievements = await listAchievements(this.prisma, { userId });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarKey: user.avatarKey,
        coverKey: user.coverKey,
        cosmetics: toCosmeticsView(user),
        role: user.role,
        status: user.status,
        reputationBadge: user.reputationBadge,
        ageRange: user.ageRange,
        campus: user.campus,
        createdAt: user.createdAt,
      },
      profiles: user.profiles,
      profile,
      profileView,
      achievements,
    };
  }

  async getDashboard(userId: string, game: GameId | undefined) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const incoming = {
      status: "PENDING" as const,
      OR: [{ receiverId: userId }, { type: "PLAYER_TO_TEAM" as const, team: { captainId: userId } }],
    };
    const profile = await findActiveProfile(this.prisma, userId, game);
    const [pendingIncoming, pendingSent, unreadMessages, latestRequest] = await Promise.all([
      this.prisma.matchRequest.count({ where: incoming }),
      this.prisma.matchRequest.count({ where: { status: "PENDING", senderId: userId } }),
      this.countUnreadMessages(userId),
      this.prisma.matchRequest.findFirst({
        where: incoming,
        include: { sender: { select: { id: true, displayName: true } }, team: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const dailyMatches = profile?.onboardingComplete
      ? (await this.matching.findMatches(userId, "find_players", profile.game, primaryPlayMode(profile))).matches.flatMap((match) => (match.type === "player" ? [match] : [])).slice(0, 3)
      : [];

    return {
      displayName: user.displayName,
      reputationBadge: user.reputationBadge,
      game: profile ? toGameSlug(profile.game) : null,
      playMode: profile ? primaryPlayMode(profile) : null,
      profile: profile
        ? {
            rank: formatRank(profile.rankTier, profile.rankLevel),
            role: profile.role,
            bio: profile.bio,
            goals: profile.goals,
            communicationStyles: profile.communicationStyles,
            playModes: profile.playModes,
            riotId: profile.riotId,
            verificationStatus: profile.verificationStatus,
            lookingStatus: profile.lookingStatus,
          }
        : null,
      readiness: profile ? buildReadiness(profile) : null,
      counts: { pendingIncoming, pendingSent, unreadMessages },
      latestRequest: latestRequest
        ? {
            id: latestRequest.id,
            fromId: latestRequest.sender.id,
            fromName: latestRequest.sender.displayName,
            teamName: latestRequest.team?.name ?? null,
            message: latestRequest.message,
            createdAt: latestRequest.createdAt,
          }
        : null,
      dailyMatches: dailyMatches.map((match) => ({
        id: match.id,
        displayName: match.displayName,
        avatarKey: match.avatarKey,
        rank: formatRank(match.rankTier, match.rankLevel),
        role: match.role,
        playModes: match.playModes,
        reputationBadge: match.reputationBadge,
        score: match.score,
        reasons: match.reasons,
      })),
    };
  }

  async getCounts(userId: string) {
    const [pendingRequests, unreadMessages] = await Promise.all([
      this.prisma.matchRequest.count({
        where: { status: "PENDING", OR: [{ receiverId: userId }, { type: "PLAYER_TO_TEAM", team: { captainId: userId } }] },
      }),
      this.countUnreadMessages(userId),
    ]);
    return { pendingRequests, unreadMessages };
  }

  private async countUnreadMessages(userId: string) {
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId, conversation: { channelId: null } },
      select: { conversationId: true, lastReadAt: true },
    });
    const counts = await Promise.all(
      memberships.map((membership) =>
        this.prisma.message.count({
          where: {
            conversationId: membership.conversationId,
            senderId: { not: userId },
            ...(membership.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {}),
          },
        }),
      ),
    );
    return counts.reduce((sum, count) => sum + count, 0);
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const game = dto.game ? GAME_MAP[dto.game] : undefined;
    const profile = await findActiveProfile(this.prisma, userId, game);
    if (!profile) {
      throw new NotFoundException("Profile not found. Complete onboarding first.");
    }
    const playModes = dto.playModes && resolvePlayModes(toGameSlug(profile.game), dto.playModes);
    if (!isAramOnly(playModes)) assertValidRankAndRole(profile, dto);

    if (dto.displayName !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { displayName: dto.displayName.trim() },
      });
    }

    const nextRiotId = dto.riotId === undefined ? profile.riotId : dto.riotId?.trim() || null;
    if (nextRiotId !== profile.riotId) await this.riot.resetVerification(profile.id);

    const updated = await this.prisma.playerProfile.update({
      where: { id: profile.id },
      data: { ...buildProfileUpdate(profile, dto), ...(playModes ? playModeUpdate(playModes) : {}) },
    });

    return { profile: updated };
  }

  async getPublicProfile(viewerId: string, targetUserId: string) {
    const [user, block, achievements] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { profiles: { where: { onboardingComplete: true }, orderBy: { createdAt: "asc" } } },
      }),
      this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: viewerId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: viewerId },
          ],
        },
        select: { id: true },
      }),
      listAchievements(this.prisma, { userId: targetUserId }),
    ]);

    if (!user || block || user.status === "BANNED" || user.profiles.length === 0) {
      throw new NotFoundException("Player not found");
    }

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarKey: user.avatarKey,
        coverKey: user.coverKey,
        cosmetics: toCosmeticsView(user),
        reputationBadge: user.reputationBadge,
        campus: user.campus,
        createdAt: user.createdAt,
      },
      profiles: user.profiles.map(toPublicGameProfile),
      achievements,
    };
  }
}

/** Replaces all questionnaire answers; answered at all = `questionnaireAt` set, all cleared = null. */
function questionnaireUpdate(answers: QuestionnaireDto) {
  const mains = answers.mains ?? [];
  const answered = Boolean(answers.voiceChat || answers.lossReaction || answers.ageRange || answers.campus || mains.length);
  return {
    profile: {
      voiceChat: answers.voiceChat ?? null,
      lossReaction: answers.lossReaction ?? null,
      mains,
      questionnaireAt: answered ? new Date() : null,
    },
    user: { ageRange: answers.ageRange ?? null, campus: answers.campus ?? null },
  };
}

/** Role lookup by id or label, case-insensitive. Roles are stored by label (as in seed data). */
function findRoleOption(gameSlug: string, value: string) {
  const needle = value.trim().toLowerCase();
  return gameRoles[gameSlug]?.find((role) => role.id === needle || role.label.toLowerCase() === needle);
}

/** Rank and role must exist in the lookup list for the profile's game. */
function assertValidRankAndRole(profile: PlayerProfile, dto: UpdateProfileDto) {
  const slug = toGameSlug(profile.game);
  if (dto.rankTier !== undefined) {
    const level = dto.rankLevel === undefined ? profile.rankLevel : dto.rankLevel;
    const known = gameRanks[slug].some((rank) => rank.tier === dto.rankTier && rank.level === (level ?? null));
    if (!known) throw new BadRequestException("Unknown rank for this game.");
  }
  if (dto.role !== undefined && !findRoleOption(slug, dto.role)) {
    throw new BadRequestException("Unknown role for this game.");
  }
}

/** New play modes; switching to ARAM-only stores Unranked / Fill (rank and role don't apply to ARAM). */
function playModeUpdate(playModes: string[]) {
  return isAramOnly(playModes) ? { playModes, rankTier: UNRANKED_TIER, rankLevel: null, role: FILL_ROLE } : { playModes };
}

type ProfileUpdate = Partial<
  Pick<
    PlayerProfile,
    "bio" | "rankTier" | "rankLevel" | "role" | "schedule" | "goals" | "communicationStyles" | "lookingStatus" | "riotId" | "verificationStatus"
  >
>;

function buildProfileUpdate(profile: PlayerProfile, dto: UpdateProfileDto): ProfileUpdate {
  const data: ProfileUpdate = {};
  if (dto.bio !== undefined) data.bio = dto.bio.trim() || null;
  if (dto.rankTier !== undefined) data.rankTier = dto.rankTier;
  if (dto.rankLevel !== undefined) data.rankLevel = dto.rankLevel;
  if (dto.role !== undefined) data.role = findRoleOption(toGameSlug(profile.game), dto.role)?.label ?? dto.role;
  if (dto.schedule !== undefined) data.schedule = dto.schedule;
  if (dto.goals !== undefined) data.goals = dto.goals;
  if (dto.communicationStyles !== undefined) data.communicationStyles = dto.communicationStyles;
  if (dto.lookingStatus !== undefined) data.lookingStatus = dto.lookingStatus;
  if (dto.riotId !== undefined) {
    const riotId = dto.riotId?.trim() || null;
    data.riotId = riotId;
    // A changed Riot ID has not been verified yet.
    if (riotId !== profile.riotId) data.verificationStatus = riotId ? "SELF_REPORTED" : "UNVERIFIED";
  }
  return data;
}
