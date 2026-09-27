import { ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { DdragonService, profileIconUrlFor } from "./ddragon.service";
import { buildLolStats, profileRankFromSolo, readLolStats, toPublicLolStats } from "./lol-stats";
import { RiotClientService } from "./riot-client.service";
import { LOL, REQUIRES_RSO, isRiotLinked, isRiotVerified, requireProfile } from "./riot-profile";

export const SYNC_COOLDOWN_MS = 10 * 60 * 1000;
const MATCH_ID_COUNT = 20;
const MATCH_DETAIL_COUNT = 10;

type ProfileWithStats = {
  id: string;
  riotId: string | null;
  riotPuuid: string | null;
  verificationStatus: string;
  verifyIconId: number | null;
  verifyExpiresAt: Date | null;
  stats: { data: unknown; syncedAt: Date } | null;
};

function linkStatus(profile: { verificationStatus: string; riotPuuid: string | null }) {
  if (isRiotVerified(profile)) return "verified" as const;
  if (isRiotLinked(profile)) return "linked" as const;
  return "unlinked" as const;
}

function nextSyncAt(syncedAt: Date | undefined) {
  return syncedAt ? new Date(syncedAt.getTime() + SYNC_COOLDOWN_MS) : null;
}

/** Match-v5 spells a few champions differently from Data Dragon's image ids. */
const DDRAGON_IDS: Record<string, string> = { FiddleSticks: "Fiddlesticks" };
const toDdragonId = (name: string | undefined) => (name ? (DDRAGON_IDS[name] ?? name) : null);

@Injectable()
export class RiotStatsService {
  private readonly logger = new Logger(RiotStatsService.name);

  constructor(
    private prisma: PrismaService,
    private client: RiotClientService,
    private ddragon: DdragonService,
  ) {}

  /** Pulls ranked entries and recent matches, stores them, and mirrors the solo rank onto the profile. */
  async pull(profileId: string, puuid: string) {
    const [summoner, entries, matchIds] = await Promise.all([
      this.client.getSummonerByPuuid(puuid),
      this.client.getLeagueEntries(puuid),
      this.client.getRankedMatchIds(puuid, MATCH_ID_COUNT),
    ]);
    const matches = await Promise.all(matchIds.slice(0, MATCH_DETAIL_COUNT).map((id) => this.client.getMatch(id)));
    const stats = buildLolStats({ puuid, summoner, entries, matches });
    const rank = profileRankFromSolo(stats.ranked.solo);
    const recentChampion = toDdragonId(stats.matches[0]?.championName);
    const profileUpdate = { ...rank, ...(recentChampion ? { recentChampion } : {}) };
    const syncedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.gameStats.upsert({
        where: { profileId },
        create: { profileId, data: stats, syncedAt },
        update: { data: stats, syncedAt },
      }),
      ...(Object.keys(profileUpdate).length ? [this.prisma.playerProfile.update({ where: { id: profileId }, data: profileUpdate })] : []),
    ]);
    return stats;
  }

  /** Used right after verification: a Riot hiccup here must not undo the verification. */
  async pullQuietly(profileId: string, puuid: string) {
    try {
      await this.pull(profileId, puuid);
      return true;
    } catch (error) {
      this.logger.warn(`Stats sync after verification failed: ${(error as Error).message}`);
      return false;
    }
  }

  async sync(userId: string, game: GameId) {
    if (game !== LOL) return REQUIRES_RSO;
    const profile = await this.findOwn(userId, game);
    if (!isRiotLinked(profile) || !profile.riotPuuid) {
      throw new ForbiddenException("Link your Riot account first");
    }
    const next = nextSyncAt(profile.stats?.syncedAt);
    if (next && next.getTime() > Date.now()) {
      const retryAfterSeconds = Math.ceil((next.getTime() - Date.now()) / 1000);
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: "Stats were synced recently", retryAfterSeconds },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.pull(profile.id, profile.riotPuuid);
    return this.getOwn(userId, game);
  }

  async getOwn(userId: string, game: GameId) {
    if (game !== LOL) return REQUIRES_RSO;
    const profile = await this.findOwn(userId, game);
    const status = linkStatus(profile);
    const ddragonVersion = await this.ddragon.latestVersion();
    const stats = status === "unlinked" ? null : readLolStats(profile.stats?.data);
    const challenge =
      status === "linked" && profile.verifyIconId !== null && profile.verifyExpiresAt
        ? {
            iconId: profile.verifyIconId,
            iconUrl: ddragonVersion ? profileIconUrlFor(ddragonVersion, profile.verifyIconId) : null,
            expiresAt: profile.verifyExpiresAt,
          }
        : null;
    return {
      status,
      riotId: profile.riotId,
      syncedAt: stats ? profile.stats!.syncedAt : null,
      nextSyncAt: stats ? nextSyncAt(profile.stats!.syncedAt) : null,
      stats,
      challenge,
      ddragonVersion,
    };
  }

  async getPublic(viewerId: string, userId: string, game: GameId) {
    if (game !== LOL) return REQUIRES_RSO;
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: userId },
          { blockerId: userId, blockedId: viewerId },
        ],
      },
      select: { id: true },
    });
    if (blocked) throw new NotFoundException("Profile not found");

    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId_game: { userId, game } },
      include: { stats: true },
    });
    if (!profile) throw new NotFoundException("Profile not found");

    const status = linkStatus(profile);
    const stats = status === "unlinked" ? null : readLolStats(profile.stats?.data);
    return {
      status,
      riotId: status === "unlinked" ? null : profile.riotId,
      syncedAt: stats ? profile.stats!.syncedAt : null,
      stats: stats ? toPublicLolStats(stats) : null,
      ddragonVersion: stats ? await this.ddragon.latestVersion() : null,
    };
  }

  private async findOwn(userId: string, game: GameId): Promise<ProfileWithStats> {
    const profile = await requireProfile(this.prisma, userId, game);
    const stats = await this.prisma.gameStats.findUnique({ where: { profileId: profile.id } });
    return { ...profile, stats };
  }
}
