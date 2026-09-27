import type { LolLeagueEntry, LolMatch, LolSummoner } from "./riot-types";

export type LolRankedEntry = {
  tier: string;
  division: string | null;
  leaguePoints: number;
  wins: number;
  losses: number;
  winrate: number;
};

export type LolMatchSummary = {
  matchId: string;
  queueId: number;
  championId: number;
  championName: string;
  position: string | null;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  win: boolean;
  remake: boolean;
  durationSeconds: number;
  endedAt: string;
};

export type LolRecentPerformance = {
  games: number;
  wins: number;
  winrate: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  csPerMin: number;
};

export type LolChampionSummary = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winrate: number;
};

export type LolRoleShare = {
  role: string;
  games: number;
  share: number;
};

/** Stored in `GameStats.data`. Remakes are listed in `matches` but excluded from every aggregate. */
export type LolStats = {
  version: 1;
  summonerLevel: number;
  profileIconId: number;
  ranked: { solo: LolRankedEntry | null; flex: LolRankedEntry | null };
  recent: LolRecentPerformance | null;
  topChampions: LolChampionSummary[];
  roles: LolRoleShare[];
  matches: LolMatchSummary[];
};

export type PublicLolStats = Pick<LolStats, "version" | "ranked" | "recent" | "topChampions" | "matches">;

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
const DIVISIONS: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
/** Ranked Solo/Duo (420) and Ranked Flex (440), both on Summoner's Rift. */
const RANKED_SR_QUEUES = new Set([420, 440]);

/** Riot marks early-surrender remakes; anything under 5 minutes is treated the same way. */
const REMAKE_SECONDS = 300;

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const percent = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

export function titleCaseTier(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

function toRankedEntry(entry: LolLeagueEntry | undefined): LolRankedEntry | null {
  if (!entry) return null;
  return {
    tier: titleCaseTier(entry.tier),
    division: APEX_TIERS.has(entry.tier) ? null : entry.rank,
    leaguePoints: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses,
    winrate: percent(entry.wins, entry.wins + entry.losses),
  };
}

/** Profile `rankTier`/`rankLevel` from the solo queue entry (Master and above have no level). */
export function profileRankFromSolo(solo: LolRankedEntry | null) {
  if (!solo) return null;
  return { rankTier: solo.tier, rankLevel: solo.division ? (DIVISIONS[solo.division] ?? null) : null };
}

export function toMatchSummary(match: LolMatch, puuid: string): LolMatchSummary | null {
  const player = match.info.participants.find((participant) => participant.puuid === puuid);
  if (!player) return null;
  return {
    matchId: match.metadata.matchId,
    queueId: match.info.queueId,
    championId: player.championId,
    championName: player.championName,
    position: player.teamPosition || null,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    cs: player.totalMinionsKilled + player.neutralMinionsKilled,
    win: player.win,
    remake: Boolean(player.gameEndedInEarlySurrender) || match.info.gameDuration < REMAKE_SECONDS,
    durationSeconds: match.info.gameDuration,
    endedAt: new Date(match.info.gameEndTimestamp ?? match.info.gameCreation + match.info.gameDuration * 1000).toISOString(),
  };
}

function recentPerformance(games: LolMatchSummary[]): LolRecentPerformance | null {
  if (games.length === 0) return null;
  const sum = (pick: (game: LolMatchSummary) => number) => games.reduce((total, game) => total + pick(game), 0);
  const [kills, deaths, assists] = [sum((g) => g.kills), sum((g) => g.deaths), sum((g) => g.assists)];
  const wins = games.filter((game) => game.win).length;
  const minutes = sum((g) => g.durationSeconds) / 60;
  return {
    games: games.length,
    wins,
    winrate: percent(wins, games.length),
    kda: round((kills + assists) / Math.max(deaths, 1), 2),
    avgKills: round(kills / games.length, 1),
    avgDeaths: round(deaths / games.length, 1),
    avgAssists: round(assists / games.length, 1),
    csPerMin: minutes === 0 ? 0 : round(sum((g) => g.cs) / minutes, 1),
  };
}

function topChampions(games: LolMatchSummary[], limit = 3): LolChampionSummary[] {
  const byChampion = new Map<number, LolChampionSummary>();
  for (const game of games) {
    const current = byChampion.get(game.championId) ?? {
      championId: game.championId,
      championName: game.championName,
      games: 0,
      wins: 0,
      winrate: 0,
    };
    byChampion.set(game.championId, { ...current, games: current.games + 1, wins: current.wins + (game.win ? 1 : 0) });
  }
  return [...byChampion.values()]
    .map((champion) => ({ ...champion, winrate: percent(champion.wins, champion.games) }))
    .sort((a, b) => b.games - a.games || b.wins - a.wins)
    .slice(0, limit);
}

function roleDistribution(games: LolMatchSummary[]): LolRoleShare[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    if (game.position) counts.set(game.position, (counts.get(game.position) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts.entries()]
    .map(([role, count]) => ({ role, games: count, share: percent(count, total) }))
    .sort((a, b) => b.games - a.games);
}

/** Solo/Duo and Flex entries from league-v4. */
export function rankedFromEntries(entries: LolLeagueEntry[]): LolStats["ranked"] {
  return {
    solo: toRankedEntry(entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5")),
    flex: toRankedEntry(entries.find((entry) => entry.queueType === "RANKED_FLEX_SR")),
  };
}

export function buildLolStats(input: {
  puuid: string;
  summoner: LolSummoner;
  entries: LolLeagueEntry[];
  matches: LolMatch[];
}): LolStats {
  const matches = input.matches
    .map((match) => toMatchSummary(match, input.puuid))
    .filter((match): match is LolMatchSummary => match !== null && RANKED_SR_QUEUES.has(match.queueId))
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const counted = matches.filter((match) => !match.remake);
  return {
    version: 1,
    summonerLevel: input.summoner.summonerLevel,
    profileIconId: input.summoner.profileIconId,
    ranked: rankedFromEntries(input.entries),
    recent: recentPerformance(counted),
    topChampions: topChampions(counted),
    roles: roleDistribution(counted),
    matches,
  };
}

/** Reads `GameStats.data` back; anything from an unknown schema version is ignored. */
export function readLolStats(data: unknown): LolStats | null {
  if (!data || typeof data !== "object" || (data as { version?: unknown }).version !== 1) return null;
  return data as LolStats;
}

export function toPublicLolStats(stats: LolStats, matchLimit = 5): PublicLolStats {
  return {
    version: stats.version,
    ranked: stats.ranked,
    recent: stats.recent,
    topChampions: stats.topChampions,
    matches: stats.matches.slice(0, matchLimit),
  };
}
