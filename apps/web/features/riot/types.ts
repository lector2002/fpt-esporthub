// Mirrors apps/api/src/modules/riot/lol-stats.ts and the /riot endpoint responses.

export interface LolRankedEntry {
  tier: string;
  division: string | null;
  leaguePoints: number;
  wins: number;
  losses: number;
  winrate: number;
}

export interface LolMatchSummary {
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
}

export interface LolRecentPerformance {
  games: number;
  wins: number;
  winrate: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  csPerMin: number;
}

export interface LolChampionSummary {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winrate: number;
}

export interface LolRoleShare {
  role: string;
  games: number;
  share: number;
}

export interface PublicLolStats {
  version: 1;
  ranked: { solo: LolRankedEntry | null; flex: LolRankedEntry | null };
  recent: LolRecentPerformance | null;
  topChampions: LolChampionSummary[];
  matches: LolMatchSummary[];
}

export interface LolStats extends PublicLolStats {
  summonerLevel: number;
  profileIconId: number;
  roles: LolRoleShare[];
}

export interface RequiresRso {
  status: "requires_rso";
}

export interface VerifyChallenge {
  iconId: number;
  iconUrl: string | null;
  expiresAt: string;
}

export type RiotLinkStatus = "unlinked" | "linked" | "verified";

export interface OwnRiotStats {
  status: RiotLinkStatus;
  riotId: string | null;
  syncedAt: string | null;
  nextSyncAt: string | null;
  stats: LolStats | null;
  challenge: VerifyChallenge | null;
  ddragonVersion: string | null;
}

export interface PublicRiotStats {
  status: RiotLinkStatus;
  riotId: string | null;
  syncedAt: string | null;
  stats: PublicLolStats | null;
  ddragonVersion: string | null;
}

export type OwnRiotStatsResponse = OwnRiotStats | RequiresRso;
export type PublicRiotStatsResponse = PublicRiotStats | RequiresRso;

/** Preview of an exact Riot ID before linking. `yours`: already linked to this profile. */
export interface RiotLookup {
  status: "found";
  riotId: string;
  summonerLevel: number;
  iconUrl: string | null;
  ranked: { solo: LolRankedEntry | null; flex: LolRankedEntry | null };
  claim: "free" | "yours" | "verified_by_other";
}

export type RiotLookupResponse = RiotLookup | RequiresRso;

/** GET /riot/suggest: accounts that may be the one being typed. `source`: found on Riot, linked here by someone, or yours. */
export interface RiotSuggestion {
  riotId: string;
  summonerLevel: number | null;
  iconUrl: string | null;
  solo: LolRankedEntry | null;
  source: "riot" | "linked" | "yours";
}
export type LinkRiotResponse = { status: "linked" | "verified"; riotId: string; synced: boolean } | RequiresRso;

export type StartVerificationResponse = { status: "pending"; iconId: number; iconUrl: string; expiresAt: string } | RequiresRso;
export type ConfirmVerificationResponse = { status: "verified"; riotId: string; synced: boolean } | RequiresRso;
