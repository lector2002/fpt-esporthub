// Subsets of the Riot API response shapes this module reads.

export type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type LolSummoner = {
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
  revisionDate: number;
};

export type LolLeagueEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type LolParticipant = {
  puuid: string;
  championId: number;
  championName: string;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  win: boolean;
  gameEndedInEarlySurrender?: boolean;
};

export type LolMatch = {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    participants: LolParticipant[];
  };
};
