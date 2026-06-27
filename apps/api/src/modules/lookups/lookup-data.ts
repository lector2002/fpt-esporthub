export const supportedGames = [
  { id: "valorant", name: "Valorant" },
  { id: "league_of_legends", name: "League of Legends" },
] as const;

export const playerGoals = [
  { id: "rank_climb", label: "Rank climb" },
  { id: "casual_play", label: "Casual play" },
  { id: "scrim_practice", label: "Scrim practice" },
  { id: "join_tournaments", label: "Join tournaments" },
  { id: "find_team", label: "Find team" },
  { id: "find_members", label: "Find members" },
] as const;

export const communicationStyles = [
  { id: "chill", label: "Chill" },
  { id: "try_hard", label: "Try-hard" },
  { id: "quiet_focus", label: "Quiet focus" },
  { id: "shotcaller", label: "Shotcaller" },
  { id: "beginner_friendly", label: "Beginner friendly" },
] as const;

const valorantRanks = [
  { tier: "Iron", level: 1, label: "Iron 1", sort: 1 },
  { tier: "Iron", level: 2, label: "Iron 2", sort: 2 },
  { tier: "Iron", level: 3, label: "Iron 3", sort: 3 },
  { tier: "Bronze", level: 1, label: "Bronze 1", sort: 4 },
  { tier: "Bronze", level: 2, label: "Bronze 2", sort: 5 },
  { tier: "Bronze", level: 3, label: "Bronze 3", sort: 6 },
  { tier: "Silver", level: 1, label: "Silver 1", sort: 7 },
  { tier: "Silver", level: 2, label: "Silver 2", sort: 8 },
  { tier: "Silver", level: 3, label: "Silver 3", sort: 9 },
  { tier: "Gold", level: 1, label: "Gold 1", sort: 10 },
  { tier: "Gold", level: 2, label: "Gold 2", sort: 11 },
  { tier: "Gold", level: 3, label: "Gold 3", sort: 12 },
  { tier: "Platinum", level: 1, label: "Platinum 1", sort: 13 },
  { tier: "Platinum", level: 2, label: "Platinum 2", sort: 14 },
  { tier: "Platinum", level: 3, label: "Platinum 3", sort: 15 },
  { tier: "Diamond", level: 1, label: "Diamond 1", sort: 16 },
  { tier: "Diamond", level: 2, label: "Diamond 2", sort: 17 },
  { tier: "Diamond", level: 3, label: "Diamond 3", sort: 18 },
  { tier: "Ascendant", level: 1, label: "Ascendant 1", sort: 19 },
  { tier: "Ascendant", level: 2, label: "Ascendant 2", sort: 20 },
  { tier: "Ascendant", level: 3, label: "Ascendant 3", sort: 21 },
  { tier: "Immortal", level: 1, label: "Immortal 1", sort: 22 },
  { tier: "Immortal", level: 2, label: "Immortal 2", sort: 23 },
  { tier: "Immortal", level: 3, label: "Immortal 3", sort: 24 },
  { tier: "Radiant", level: null, label: "Radiant", sort: 25 },
] as const;

const lolRanks = [
  { tier: "Iron", level: 4, label: "Iron IV", sort: 1 },
  { tier: "Iron", level: 3, label: "Iron III", sort: 2 },
  { tier: "Iron", level: 2, label: "Iron II", sort: 3 },
  { tier: "Iron", level: 1, label: "Iron I", sort: 4 },
  { tier: "Bronze", level: 4, label: "Bronze IV", sort: 5 },
  { tier: "Bronze", level: 3, label: "Bronze III", sort: 6 },
  { tier: "Bronze", level: 2, label: "Bronze II", sort: 7 },
  { tier: "Bronze", level: 1, label: "Bronze I", sort: 8 },
  { tier: "Silver", level: 4, label: "Silver IV", sort: 9 },
  { tier: "Silver", level: 3, label: "Silver III", sort: 10 },
  { tier: "Silver", level: 2, label: "Silver II", sort: 11 },
  { tier: "Silver", level: 1, label: "Silver I", sort: 12 },
  { tier: "Gold", level: 4, label: "Gold IV", sort: 13 },
  { tier: "Gold", level: 3, label: "Gold III", sort: 14 },
  { tier: "Gold", level: 2, label: "Gold II", sort: 15 },
  { tier: "Gold", level: 1, label: "Gold I", sort: 16 },
  { tier: "Platinum", level: 4, label: "Platinum IV", sort: 17 },
  { tier: "Platinum", level: 3, label: "Platinum III", sort: 18 },
  { tier: "Platinum", level: 2, label: "Platinum II", sort: 19 },
  { tier: "Platinum", level: 1, label: "Platinum I", sort: 20 },
  { tier: "Emerald", level: 4, label: "Emerald IV", sort: 21 },
  { tier: "Emerald", level: 3, label: "Emerald III", sort: 22 },
  { tier: "Emerald", level: 2, label: "Emerald II", sort: 23 },
  { tier: "Emerald", level: 1, label: "Emerald I", sort: 24 },
  { tier: "Diamond", level: 4, label: "Diamond IV", sort: 25 },
  { tier: "Diamond", level: 3, label: "Diamond III", sort: 26 },
  { tier: "Diamond", level: 2, label: "Diamond II", sort: 27 },
  { tier: "Diamond", level: 1, label: "Diamond I", sort: 28 },
  { tier: "Master", level: null, label: "Master", sort: 29 },
  { tier: "Grandmaster", level: null, label: "Grandmaster", sort: 30 },
  { tier: "Challenger", level: null, label: "Challenger", sort: 31 },
] as const;

export const gameRanks: Record<string, ReadonlyArray<{ tier: string; level: number | null; label: string; sort: number }>> = {
  valorant: valorantRanks,
  league_of_legends: lolRanks,
};

export const gameRoles: Record<string, ReadonlyArray<{ id: string; label: string }>> = {
  valorant: [
    { id: "duelist", label: "Duelist" },
    { id: "initiator", label: "Initiator" },
    { id: "controller", label: "Controller" },
    { id: "sentinel", label: "Sentinel" },
  ],
  league_of_legends: [
    { id: "top", label: "Top" },
    { id: "jungle", label: "Jungle" },
    { id: "mid", label: "Mid" },
    { id: "adc", label: "ADC" },
    { id: "support", label: "Support" },
  ],
};
