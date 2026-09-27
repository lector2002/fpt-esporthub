import { BadRequestException, ConflictException, GoneException, Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";
import type { GameId } from "@fpt-esporthub/database";
import { PrismaService } from "../prisma/prisma.service";
import { ReputationService } from "../reputation/reputation.service";
import { DdragonService, profileIconUrlFor } from "./ddragon.service";
import { rankedFromEntries, type LolStats } from "./lol-stats";
import { RiotClientService } from "./riot-client.service";
import { LOL, REQUIRES_RSO, isRiotLinked, isRiotVerified, parseRiotId, requireProfile } from "./riot-profile";
import { RiotStatsService } from "./riot-stats.service";
import { MAX_RIOT_SUGGESTIONS, riotIdCandidates, riotNamePrefix } from "./riot-suggest";

const CHALLENGE_MS = 10 * 60 * 1000;
/** Free starter summoner icons every account owns. */
const STARTER_ICON_COUNT = 29;
export const ICON_NOT_CHANGED = "Icon not changed yet";

const UNLINKED = { riotId: null, riotPuuid: null, verifyIconId: null, verifyExpiresAt: null, verificationStatus: "UNVERIFIED" } as const;

/** Random starter icon (0-28) different from the current one. */
function pickChallengeIcon(currentIconId: number) {
  const candidates = Array.from({ length: STARTER_ICON_COUNT }, (_, id) => id).filter((id) => id !== currentIconId);
  return candidates[randomInt(candidates.length)];
}

/**
 * League of Legends account linking. Picking an account from a lookup links it (LINKED: real rank and stats);
 * the summoner-icon challenge proves ownership (VERIFIED) and releases the account from anyone else who linked it.
 */
@Injectable()
export class RiotService {
  constructor(
    private prisma: PrismaService,
    private client: RiotClientService,
    private ddragon: DdragonService,
    private stats: RiotStatsService,
    private reputation: ReputationService,
  ) {}

  /** Preview of an exact Riot ID before linking it. */
  async lookup(userId: string, game: GameId, riotId: string | undefined) {
    if (game !== LOL) return REQUIRES_RSO;
    const { gameName, tagLine } = parseRiotId(riotId);
    const account = await this.client.getAccountByRiotId(gameName, tagLine);
    const [summoner, entries, own, verifiedByOther] = await Promise.all([
      this.client.getSummonerByPuuid(account.puuid),
      this.client.getLeagueEntries(account.puuid),
      this.prisma.playerProfile.findUnique({ where: { userId_game: { userId, game } }, select: { riotPuuid: true, verificationStatus: true } }),
      this.findVerifiedByOther(account.puuid, userId),
    ]);
    const claim = verifiedByOther ? "verified_by_other" : own && own.riotPuuid === account.puuid && isRiotLinked(own) ? "yours" : "free";
    return {
      status: "found" as const,
      riotId: `${account.gameName}#${account.tagLine}`,
      summonerLevel: summoner.summonerLevel,
      iconUrl: await this.ddragon.profileIconUrl(summoner.profileIconId),
      ranked: rankedFromEntries(entries),
      claim,
    };
  }

  /**
   * Accounts the user may mean while typing: exact Riot lookups of likely full IDs (the name with default tags),
   * then accounts already linked here whose name starts with it (Riot IDs are public on profiles). Accounts another
   * user verified are left out since they can't be linked.
   */
  async suggest(userId: string, game: GameId, input: string | undefined) {
    const query = input ?? "";
    const name = riotNamePrefix(query);
    if (game !== LOL || !name) return { suggestions: [] };
    const [fromRiot, linked] = await Promise.all([
      Promise.all(riotIdCandidates(query).map((riotId) => this.previewOrNull(riotId))),
      this.prisma.playerProfile.findMany({
        where: {
          game,
          riotId: { startsWith: name, mode: "insensitive" },
          OR: [{ userId }, { verificationStatus: "LINKED" }],
        },
        select: { userId: true, riotId: true, riotPuuid: true, verificationStatus: true, stats: { select: { data: true } } },
        take: MAX_RIOT_SUGGESTIONS,
      }),
    ]);
    const version = await this.ddragon.latestVersion();
    const fromApp = linked
      .filter((profile) => profile.riotId && isRiotLinked(profile))
      .map((profile) => {
        const stats = profile.stats?.data as LolStats | undefined;
        return {
          riotId: profile.riotId!,
          summonerLevel: stats?.summonerLevel ?? null,
          iconUrl: stats && version ? profileIconUrlFor(version, stats.profileIconId) : null,
          solo: stats?.ranked.solo ?? null,
          source: profile.userId === userId ? ("yours" as const) : ("linked" as const),
        };
      });
    const seen = new Set<string>();
    const suggestions = [...fromRiot.filter((item) => item !== null), ...fromApp].filter((item) => {
      const key = item.riotId.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { suggestions: suggestions.slice(0, MAX_RIOT_SUGGESTIONS) };
  }

  /** Riot preview of an exact ID; null when no LoL account has it or Riot is busy (suggestions are best effort). */
  private async previewOrNull(riotId: string) {
    const { gameName, tagLine } = parseRiotId(riotId);
    try {
      const account = await this.client.getAccountByRiotId(gameName, tagLine);
      const [summoner, entries] = await Promise.all([this.client.getSummonerByPuuid(account.puuid), this.client.getLeagueEntries(account.puuid)]);
      return {
        riotId: `${account.gameName}#${account.tagLine}`,
        summonerLevel: summoner.summonerLevel as number | null,
        iconUrl: (await this.ddragon.profileIconUrl(summoner.profileIconId)) as string | null,
        solo: rankedFromEntries(entries).solo,
        source: "riot" as "riot" | "linked" | "yours",
      };
    } catch {
      return null;
    }
  }

  async link(userId: string, game: GameId, riotId: string | undefined) {
    if (game !== LOL) return REQUIRES_RSO;
    const profile = await requireProfile(this.prisma, userId, game);
    const { gameName, tagLine } = parseRiotId(riotId);
    const account = await this.client.getAccountByRiotId(gameName, tagLine);
    const canonicalId = `${account.gameName}#${account.tagLine}`;
    if (profile.riotPuuid === account.puuid && isRiotLinked(profile)) {
      return { status: isRiotVerified(profile) ? ("verified" as const) : ("linked" as const), riotId: profile.riotId ?? canonicalId, synced: true };
    }
    await this.assertPuuidUnclaimed(account.puuid, userId);

    await this.prisma.$transaction([
      this.prisma.gameStats.deleteMany({ where: { profileId: profile.id } }),
      this.prisma.playerProfile.update({
        where: { id: profile.id },
        data: { riotId: canonicalId, riotPuuid: account.puuid, verifyIconId: null, verifyExpiresAt: null, verificationStatus: "LINKED" },
      }),
    ]);
    if (isRiotVerified(profile)) await this.reputation.updateBadge(userId);
    const synced = await this.stats.pullQuietly(profile.id, account.puuid);
    return { status: "linked" as const, riotId: canonicalId, synced };
  }

  async unlink(userId: string, game: GameId) {
    const profile = await requireProfile(this.prisma, userId, game);
    await this.prisma.$transaction([
      this.prisma.gameStats.deleteMany({ where: { profileId: profile.id } }),
      this.prisma.playerProfile.update({ where: { id: profile.id }, data: UNLINKED }),
    ]);
    if (isRiotVerified(profile)) await this.reputation.updateBadge(userId);
    return { status: "unlinked" as const };
  }

  async startVerification(userId: string, game: GameId) {
    if (game !== LOL) return REQUIRES_RSO;
    const profile = await requireProfile(this.prisma, userId, game);
    if (isRiotVerified(profile)) throw new ConflictException("Riot account already verified");
    if (!isRiotLinked(profile) || !profile.riotPuuid) throw new BadRequestException("Link your Riot account first");
    await this.assertPuuidUnclaimed(profile.riotPuuid, userId);
    const summoner = await this.client.getSummonerByPuuid(profile.riotPuuid);

    const iconId = pickChallengeIcon(summoner.profileIconId);
    const iconUrl = await this.ddragon.profileIconUrl(iconId);
    const expiresAt = new Date(Date.now() + CHALLENGE_MS);
    await this.prisma.playerProfile.update({
      where: { id: profile.id },
      data: { verifyIconId: iconId, verifyExpiresAt: expiresAt },
    });
    return { status: "pending" as const, iconId, iconUrl, expiresAt };
  }

  async confirmVerification(userId: string, game: GameId) {
    if (game !== LOL) return REQUIRES_RSO;
    const profile = await requireProfile(this.prisma, userId, game);
    const { riotPuuid: puuid, verifyIconId, verifyExpiresAt } = profile;
    if (!isRiotLinked(profile) || !puuid || verifyIconId === null || !verifyExpiresAt) {
      throw new BadRequestException("Start verification first");
    }
    if (verifyExpiresAt.getTime() < Date.now()) {
      throw new GoneException("Verification expired. Start again to get a new icon.");
    }
    await this.assertPuuidUnclaimed(puuid, userId);

    const summoner = await this.client.getSummonerByPuuid(puuid);
    if (summoner.profileIconId !== verifyIconId) throw new ConflictException(ICON_NOT_CHANGED);

    const account = await this.client.getAccountByPuuid(puuid);
    const riotId = `${account.gameName}#${account.tagLine}`;
    // Proven owner wins: everyone else who only linked this account loses the link and its stats.
    const others = await this.prisma.playerProfile.findMany({
      where: { game: LOL, riotPuuid: puuid, NOT: { id: profile.id } },
      select: { id: true },
    });
    const otherIds = others.map((other) => other.id);
    await this.prisma.$transaction([
      this.prisma.playerProfile.update({
        where: { id: profile.id },
        data: { verificationStatus: "VERIFIED", riotId, verifyIconId: null, verifyExpiresAt: null },
      }),
      this.prisma.gameStats.deleteMany({ where: { profileId: { in: otherIds } } }),
      this.prisma.playerProfile.updateMany({ where: { id: { in: otherIds } }, data: UNLINKED }),
    ]);
    await this.reputation.updateBadge(userId);
    const synced = await this.stats.pullQuietly(profile.id, puuid);
    return { status: "verified" as const, riotId, synced };
  }

  /** Call when the user changes their Riot ID: drops the link to the old account and its stats. */
  async resetVerification(profileId: string) {
    const [, profile] = await this.prisma.$transaction([
      this.prisma.gameStats.deleteMany({ where: { profileId } }),
      this.prisma.playerProfile.update({
        where: { id: profileId },
        data: { riotPuuid: null, verifyIconId: null, verifyExpiresAt: null, verificationStatus: "UNVERIFIED" },
      }),
    ]);
    await this.reputation.updateBadge(profile.userId);
  }

  private findVerifiedByOther(puuid: string, userId: string) {
    return this.prisma.playerProfile.findFirst({
      where: { game: LOL, riotPuuid: puuid, verificationStatus: "VERIFIED", NOT: { userId } },
      select: { id: true },
    });
  }

  private async assertPuuidUnclaimed(puuid: string, userId: string) {
    if (await this.findVerifiedByOther(puuid, userId)) {
      throw new ConflictException("This Riot account is already verified by another user");
    }
  }
}
