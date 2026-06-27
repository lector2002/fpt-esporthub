import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { OnboardingDto } from "./dto/onboarding.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

const GAME_MAP: Record<string, GameId> = {
  valorant: "VALORANT",
  league_of_legends: "LEAGUE_OF_LEGENDS",
};

function formatRank(rankTier: string, rankLevel: number | null) {
  return rankLevel ? `${rankTier} ${rankLevel}` : rankTier;
}

function buildReadiness(profile: {
  bio: string | null;
  game: string;
  rankTier: string;
  schedule: string[];
  goals: string[];
  communicationStyles: string[];
  riotId: string | null;
  verificationStatus: string;
}) {
  const checks = [
    { label: "Basic Info", complete: Boolean(profile.bio) },
    { label: "Game & Rank", complete: Boolean(profile.game && profile.rankTier) },
    { label: "Schedule", complete: profile.schedule.length > 0 },
    { label: "Goals", complete: profile.goals.length > 0 },
    { label: "Comm Style", complete: profile.communicationStyles.length >= 2 },
    { label: "Riot ID Verification", complete: profile.verificationStatus === "VERIFIED" && Boolean(profile.riotId) },
  ];
  const percent = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100);
  return { percent, checks };
}

function buildGameConnections(profile: {
  game: string;
  riotId: string | null;
  verificationStatus: string;
}) {
  const riotConnected = profile.verificationStatus === "VERIFIED" && Boolean(profile.riotId);
  return [
    {
      game: "League of Legends",
      gameId: "league_of_legends",
      icon: "🧙",
      status: riotConnected ? "connected" : profile.riotId ? "ready_to_verify" : "not_connected",
      statusLabel: riotConnected ? "Connected" : profile.riotId ? "Ready to verify" : "Not connected",
      description: "Dùng Riot ID để lấy PUUID, Summoner data và ranked info qua Riot API.",
      requirement: "Cần RIOT_API_KEY. Xác minh sở hữu mạnh nên dùng RSO nếu mở public beta.",
      complexity: "Medium",
    },
    {
      game: "Valorant",
      gameId: "valorant",
      icon: "🔫",
      status: riotConnected && profile.game === "VALORANT" ? "connected" : "requires_rso",
      statusLabel: riotConnected && profile.game === "VALORANT" ? "Connected" : "Requires RSO",
      description: "Valorant official APIs yêu cầu người chơi opt-in qua Riot Sign On để chia sẻ dữ liệu cá nhân.",
      requirement: "Cần production key + RSO client. Personal key không hỗ trợ Valorant app.",
      complexity: "High",
    },
  ];
}

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async saveOnboarding(userId: string, dto: OnboardingDto) {
    const gameId = GAME_MAP[dto.game];
    if (!gameId) {
      throw new NotFoundException(`Unknown game: ${dto.game}`);
    }

    const profile = await this.prisma.playerProfile.upsert({
      where: { userId },
      update: {
        game: gameId,
        rankTier: dto.rankTier,
        rankLevel: dto.rankLevel ?? null,
        role: dto.role,
        schedule: dto.schedule,
        goals: dto.goals,
        communicationStyles: dto.communicationStyles,
        riotId: dto.riotId ?? null,
        onboardingComplete: true,
      },
      create: {
        userId,
        game: gameId,
        rankTier: dto.rankTier,
        rankLevel: dto.rankLevel ?? null,
        role: dto.role,
        schedule: dto.schedule,
        goals: dto.goals,
        communicationStyles: dto.communicationStyles,
        riotId: dto.riotId ?? null,
        onboardingComplete: true,
      },
    });

    return { profile };
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        teamMemberships: {
          include: {
            team: {
              include: {
                _count: { select: { members: true } },
              },
            },
          },
        },
        captainedTeams: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const profileView = user.profile
      ? {
          displayName: user.displayName,
          email: user.email,
          university: user.email.endsWith("@fpt.edu.vn") ? "FPT U" : "FPT EsportHub",
          avatarEmoji: "🦊",
          gameLabel: user.profile.game === "VALORANT" ? "Valorant" : "League of Legends",
          gameTheme: user.profile.game === "VALORANT" ? "valorant" : "lol",
          rankLabel: formatRank(user.profile.rankTier, user.profile.rankLevel),
          roleLabel: user.profile.role,
          riotId: user.profile.riotId,
          bio: user.profile.bio ?? "Duelist chính hiệu, thích scrim nghiêm túc nhưng vẫn vui vẻ, không toxic.",
          lookingForTeam: user.profile.lookingStatus === "open_to_match",
          verificationLabel: user.profile.verificationStatus === "VERIFIED" ? "Verified" : user.profile.riotId ? "Pending" : "Self-reported",
          reputationLabel: user.profile.reputationBadge === "TRUSTED" ? "Trusted" : user.profile.reputationBadge === "VERIFIED" ? "Verified" : user.profile.reputationBadge === "CAUTION" ? "Caution" : "New",
          emailVerified: user.email.endsWith("@fpt.edu.vn"),
          goals: user.profile.goals,
          communicationStyles: user.profile.communicationStyles,
          availability: user.profile.schedule.map((item, index) => ({
            label: item,
            detail: index === 0 ? "Khung giờ chính" : "Khung giờ phụ",
            tag: index === 0 ? "Stable" : "Flexible",
          })),
          readiness: buildReadiness(user.profile),
          gameConnections: buildGameConnections(user.profile),
          teams: [
            ...user.teamMemberships.map((membership) => ({
              id: membership.team.id,
              name: membership.team.name,
              tag: membership.team.name.slice(0, 3).toUpperCase(),
              gameLabel: membership.team.game === "VALORANT" ? "Valorant" : "League of Legends",
              role: membership.role === "captain" ? "Captain" : "Member",
              memberCount: membership.team._count.members,
              neededRoles: membership.team.neededRoles,
            })),
            ...user.captainedTeams
              .filter((team) => !user.teamMemberships.some((membership) => membership.team.id === team.id))
              .map((team) => ({
                id: team.id,
                name: team.name,
                tag: team.name.slice(0, 3).toUpperCase(),
                gameLabel: team.game === "VALORANT" ? "Valorant" : "League of Legends",
                role: "Captain",
                memberCount: team._count.members,
                neededRoles: team.neededRoles,
              })),
          ],
        }
      : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      profile: user.profile,
      profileView,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        "Profile not found. Complete onboarding first.",
      );
    }

    if (dto.displayName !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { displayName: dto.displayName },
      });
    }

    const profileData: Record<string, unknown> = {};
    if (dto.bio !== undefined) profileData.bio = dto.bio;
    if (dto.game !== undefined) {
      const gameId = GAME_MAP[dto.game];
      if (!gameId) throw new NotFoundException(`Unknown game: ${dto.game}`);
      profileData.game = gameId;
    }
    if (dto.rankTier !== undefined) profileData.rankTier = dto.rankTier;
    if (dto.rankLevel !== undefined) profileData.rankLevel = dto.rankLevel;
    if (dto.role !== undefined) profileData.role = dto.role;
    if (dto.schedule !== undefined) profileData.schedule = dto.schedule;
    if (dto.goals !== undefined) profileData.goals = dto.goals;
    if (dto.communicationStyles !== undefined)
      profileData.communicationStyles = dto.communicationStyles;
    if (dto.lookingStatus !== undefined)
      profileData.lookingStatus = dto.lookingStatus;
    if (dto.riotId !== undefined) profileData.riotId = dto.riotId;

    const updated = await this.prisma.playerProfile.update({
      where: { userId },
      data: profileData,
    });

    return { profile: updated };
  }

  async verifyRiotId(userId: string) {
    const profile = await this.prisma.playerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Profile not found. Complete onboarding first.");
    if (!profile.riotId || !profile.riotId.includes("#")) {
      throw new BadRequestException("Set Riot ID as GameName#TagLine before verification.");
    }

    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException("RIOT_API_KEY is not configured.");
    }

    const [gameName, tagLine] = profile.riotId.split("#");
    const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    const response = await fetch(url, { headers: { "X-Riot-Token": apiKey } });
    if (!response.ok) {
      throw new BadRequestException(`Riot ID verification failed with status ${response.status}.`);
    }

    const account = await response.json() as { puuid: string; gameName: string; tagLine: string };
    const updated = await this.prisma.playerProfile.update({
      where: { userId },
      data: { verificationStatus: "VERIFIED", riotId: `${account.gameName}#${account.tagLine}` },
    });

    return {
      profile: updated,
      riotAccount: {
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
      },
      note: "LoL can continue with Summoner/Rank endpoints. Valorant personal stats require RSO opt-in and production access.",
    };
  }

  async getPublicProfile(viewerId: string, targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.profile) {
      throw new NotFoundException("Profile not found");
    }

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      profile: user.profile,
    };
  }
}
