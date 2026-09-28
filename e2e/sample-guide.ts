// A hand-made guide shaped like an imported one, stored under its own source so tests can remove it.
export const SAMPLE_SOURCE = "e2e-sample";

const stat = (pickRate: number, winRate: number, games: number) => ({ pickRate, winRate, games });

export const SAMPLE_GUIDE = {
  tier: 1,
  runes: [
    { primaryStyle: 8100, subStyle: 8200, perks: [8112, 8143, 8140, 8135, 8226, 8210], shards: [5008, 5008, 5011], ...stat(41.2, 52.6, 48210) },
    { primaryStyle: 8200, subStyle: 8300, perks: [8229, 8226, 8210, 8237, 8304, 8347], shards: [5008, 5008, 5001], ...stat(22.4, 51.1, 26102) },
    { primaryStyle: 8000, subStyle: 8100, perks: [8021, 9111, 9105, 8299, 8143, 8135], shards: [5005, 5008, 5011], ...stat(3.1, 47.4, 640) },
  ],
  spells: [
    { ids: [4, 14], ...stat(71.5, 52.3, 83400) },
    { ids: [4, 12], ...stat(20.1, 50.8, 23450) },
    { ids: [4, 21], ...stat(5.4, 49.6, 6300) },
  ],
  skillOrder: [
    // Cut at 15 like op.gg; the API fills in R, E, E for 16-18.
    { order: ["Q", "W", "E"], levels: ["Q", "W", "E", "Q", "Q", "R", "Q", "W", "Q", "W", "R", "W", "W", "E", "E"], ...stat(82.4, 52.4, 96100) },
    { order: ["Q", "E", "W"], ...stat(12.9, 50.2, 15040) },
  ],
  starterItems: [
    { ids: [1056, 2003, 2003], ...stat(78.3, 52.1, 91300) },
    { ids: [1082, 2003], ...stat(18.7, 51.4, 21800) },
  ],
  coreBuilds: [
    { ids: [6655, 4645, 3089], ...stat(18.4, 55.1, 21450) },
    { ids: [6655, 3157, 3089], ...stat(9.2, 54.3, 10730) },
    { ids: [3100, 4646, 3089], ...stat(4.8, 53.0, 5600) },
  ],
  boots: [
    { ids: [3020], ...stat(68.2, 52.5, 79500) },
    { ids: [3158], ...stat(24.6, 51.3, 28700) },
  ],
  fourthItems: [
    { ids: [3135], ...stat(34.1, 60.2, 9120) },
    { ids: [3157], ...stat(22.8, 58.9, 6090) },
    { ids: [3102], ...stat(8.5, 57.1, 2270) },
  ],
  fifthItems: [
    { ids: [3157], ...stat(30.4, 63.5, 3050) },
    { ids: [3135], ...stat(27.9, 62.1, 2800) },
  ],
  sixthItems: [
    { ids: [3102], ...stat(26.3, 66.2, 870) },
    { ids: [3165], ...stat(12.0, 64.8, 400) },
  ],
  weakAgainst: [
    { champion: "Kassadin", winRate: 46.1, games: 3210 },
    { champion: "Galio", winRate: 47.0, games: 4120 },
    { champion: "Malzahar", winRate: 47.8, games: 2980 },
    { champion: "Akali", winRate: 48.3, games: 3640 },
    { champion: "Yasuo", winRate: 48.9, games: 5020 },
  ],
  strongAgainst: [
    { champion: "Veigar", winRate: 56.4, games: 2890 },
    { champion: "Lux", winRate: 55.2, games: 3310 },
    { champion: "Viktor", winRate: 54.7, games: 2760 },
    { champion: "Zed", winRate: 53.9, games: 4480 },
    { champion: "Syndra", winRate: 53.1, games: 2150 },
  ],
};

/** The guide the test opens, plus a thin second position so the position tabs show. */
export const SAMPLE_ROWS = [
  { champion: "Ahri", position: "mid", winRate: 52.4, pickRate: 9.8, banRate: 6.1, data: SAMPLE_GUIDE },
  { champion: "Ahri", position: "support", winRate: 48.2, pickRate: 0.4, banRate: 6.1, data: SAMPLE_GUIDE },
];
