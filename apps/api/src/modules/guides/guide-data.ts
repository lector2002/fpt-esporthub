/** Build stats for one champion and position. Ids are Data Dragon ids (items, rune perks/styles, summoner spell keys, champion ids). */
export interface OptionStats {
  pickRate: number;
  winRate: number;
  games: number;
}

export interface BuildOption extends OptionStats {
  ids: number[];
}

export interface SkillOrderOption extends OptionStats {
  /** Max order, e.g. ["Q", "E", "W"]. */
  order: string[];
  /** Skill put in at each level from 1, e.g. ["Q", "W", "E", "Q", ...]; optional, up to 18. */
  levels?: string[];
}

export interface RunePage extends OptionStats {
  primaryStyle: number;
  subStyle: number;
  /** Keystone + 3 primary runes + 2 secondary runes, in tree order. */
  perks: number[];
  /** Stat shards: offense, flex, defense. */
  shards?: number[];
}

export interface Matchup {
  /** Data Dragon champion id of the opponent. */
  champion: string;
  /** This champion's win rate against them. */
  winRate: number;
  games: number;
}

export interface GuideData {
  /** Source tier: 0 = OP, then 1 (best) to 5. */
  tier?: number;
  spells: BuildOption[];
  skillOrder: SkillOrderOption[];
  starterItems: BuildOption[];
  boots: BuildOption[];
  coreBuilds: BuildOption[];
  runes: RunePage[];
  /** Options for the 4th, 5th and 6th item, each one item id. */
  fourthItems?: BuildOption[];
  fifthItems?: BuildOption[];
  sixthItems?: BuildOption[];
  /** Hardest (lowest win rate) and easiest lane opponents. */
  weakAgainst?: Matchup[];
  strongAgainst?: Matchup[];
}

export const POSITIONS = ["top", "jungle", "mid", "adc", "support"] as const;
export type Position = (typeof POSITIONS)[number];

const REQUIRED = ["spells", "skillOrder", "starterItems", "boots", "coreBuilds", "runes"] as const;
const OPTIONAL = ["fourthItems", "fifthItems", "sixthItems", "weakAgainst", "strongAgainst"] as const;
type Section = (typeof REQUIRED)[number] | (typeof OPTIONAL)[number];
const SECTIONS: Section[] = [...REQUIRED, ...OPTIONAL];

/** How many entries of each section the free tier shows. Premium shows everything. */
const FREE_COUNT: Record<Section, number> = {
  spells: 1,
  skillOrder: 1,
  starterItems: 1,
  boots: 1,
  coreBuilds: 1,
  runes: 1,
  fourthItems: 1,
  fifthItems: 1,
  sixthItems: 1,
  weakAgainst: 3,
  strongAgainst: 3,
};

export function freeTier(data: GuideData): GuideData {
  const free: Record<string, unknown> = { tier: data.tier };
  for (const section of SECTIONS) {
    const list = data[section];
    if (list) free[section] = list.slice(0, FREE_COUNT[section]);
  }
  return free as unknown as GuideData;
}

const MAX_RANK: Record<string, number> = { Q: 5, W: 5, E: 5, R: 3 };
const R_LEVELS = [6, 11, 16];

/**
 * Sources list the path only to level 15; the rest follows from the rules: R takes its last rank at 16, then the basic
 * abilities not yet maxed fill in by max order. Paths that don't fit those rules (champions with other ranks, like
 * Udyr or Jayce) or are cut before 15 are left as they are.
 */
export function fullSkillPath(levels: string[], order: string[]): string[] {
  const ranks = (path: string[], key: string) => path.filter((skill) => skill === key).length;
  const standard = levels.every((key, i) => (key === "R") === R_LEVELS.includes(i + 1)) && Object.keys(MAX_RANK).every((key) => ranks(levels, key) <= MAX_RANK[key]);
  if (levels.length < 15 || !standard) return levels;
  const path = [...levels];
  while (path.length < 18) {
    const next = R_LEVELS.includes(path.length + 1) ? "R" : [...order, "Q", "W", "E"].find((key) => key !== "R" && ranks(path, key) < MAX_RANK[key]);
    if (!next) break;
    path.push(next);
  }
  return path;
}

export function withFullSkillPaths(data: GuideData): GuideData {
  return { ...data, skillOrder: data.skillOrder.map((option) => (option.levels ? { ...option, levels: fullSkillPath(option.levels, option.order) } : option)) };
}

/** Entries per section that premium adds on top of the free tier. */
export function lockedCounts(data: GuideData) {
  return Object.fromEntries(SECTIONS.map((section) => [section, Math.max(0, (data[section]?.length ?? 0) - FREE_COUNT[section])])) as Record<Section, number>;
}

const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const isStats = (value: Record<string, unknown>) => isNumber(value.winRate) && isNumber(value.games) && (value.pickRate === undefined || isNumber(value.pickRate));
const isIds = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every((id) => Number.isInteger(id));
const isObjectList = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && isStats(item as Record<string, unknown>));
const SKILLS = ["Q", "W", "E", "R"];

/** Checks an imported payload before it is stored; a source that changed its layout fails here instead of saving junk. */
export function isGuideData(value: unknown): value is GuideData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  if (data.tier !== undefined && !Number.isInteger(data.tier)) return false;
  if (!REQUIRED.every((section) => isObjectList(data[section]))) return false;
  if (!OPTIONAL.every((section) => data[section] === undefined || isObjectList(data[section]))) return false;
  const lists = (names: readonly string[]) => names.flatMap((name) => (data[name] as Record<string, unknown>[] | undefined) ?? []);
  const itemOptions = lists(["spells", "starterItems", "boots", "coreBuilds", "fourthItems", "fifthItems", "sixthItems"]);
  if (!itemOptions.every((item) => isNumber(item.pickRate) && isIds(item.ids))) return false;
  const skillsOk = lists(["skillOrder"]).every(
    (item) =>
      isNumber(item.pickRate) &&
      Array.isArray(item.order) &&
      item.order.every((key) => SKILLS.includes(key as string)) &&
      (item.levels === undefined || (Array.isArray(item.levels) && item.levels.length <= 18 && item.levels.every((key) => SKILLS.includes(key as string)))),
  );
  if (!skillsOk) return false;
  const runesOk = lists(["runes"]).every(
    (page) => isNumber(page.pickRate) && Number.isInteger(page.primaryStyle) && Number.isInteger(page.subStyle) && isIds(page.perks) && (page.shards === undefined || isIds(page.shards)),
  );
  if (!runesOk) return false;
  return lists(["weakAgainst", "strongAgainst"]).every((matchup) => typeof matchup.champion === "string" && matchup.champion.length > 0);
}
