/** Mirrors apps/api guides/guide-data.ts. */
export const POSITIONS = ["top", "jungle", "mid", "adc", "support"] as const;
export type Position = (typeof POSITIONS)[number];

export interface GuideSummary {
  champion: string;
  position: Position;
  patch: string;
  winRate: number | null;
  pickRate: number | null;
  banRate: number | null;
  fetchedAt: string;
}

interface Stats {
  pickRate: number;
  winRate: number;
  games: number;
}

export interface BuildOption extends Stats {
  ids: number[];
}

export interface SkillOrderOption extends Stats {
  order: string[];
  levels?: string[];
}

export interface RunePage extends Stats {
  primaryStyle: number;
  subStyle: number;
  perks: number[];
  shards?: number[];
}

export interface Matchup {
  champion: string;
  winRate: number;
  games: number;
}

export interface GuideData {
  /** 0 = OP, then 1 (best) to 5. */
  tier?: number;
  spells: BuildOption[];
  skillOrder: SkillOrderOption[];
  starterItems: BuildOption[];
  boots: BuildOption[];
  coreBuilds: BuildOption[];
  runes: RunePage[];
  fourthItems?: BuildOption[];
  fifthItems?: BuildOption[];
  sixthItems?: BuildOption[];
  weakAgainst?: Matchup[];
  strongAgainst?: Matchup[];
}

export type Section = Exclude<keyof GuideData, "tier">;

/** GET /guides/:champion/:position */
export interface GuideDetail {
  guide: GuideSummary & { source: string; sourceUrl: string };
  free: GuideData;
  /** Every option; null without premium. */
  premium: GuideData | null;
  /** Entries premium would add per section; null with premium. */
  locked: Record<Section, number> | null;
  positions: Position[];
  premiumUntil: string | null;
}

export interface PremiumStatus {
  premiumUntil: string | null;
  price: { credits: number; days: number };
}
