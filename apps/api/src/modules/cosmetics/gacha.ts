import { COSMETICS, RARITIES, type CosmeticItem, type Rarity } from "./catalog";

/** Credits per pull. Cheaper than any item bought directly, but you don't pick what you get. */
export const GACHA_PRICE = 10;

/** Opens in one go for GACHA_PRICE each; the batch always holds a rare or better while the box still has one. */
export const GACHA_BATCH = 10;

/** Chance of each rarity when the pool has all three; rarities missing from the pool share nothing. */
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 88, rare: 10, epic: 2 };

/** A limited banner's featured item drops on 1 pull in LIMITED_ODDS (0.1%) until the player owns it. */
export const LIMITED_ODDS = 1000;

/** The standard box, plus one limited banner per limited item that holds everything standard does and that item. */
export const GACHA_BANNERS = [
  { id: "standard", featured: null },
  { id: "limited_goldenleader", featured: "pet_goldenleader" },
  { id: "limited_hiyuki", featured: "pet_hiyuki" },
] as const satisfies { id: string; featured: string | null }[];
export type GachaBanner = (typeof GACHA_BANNERS)[number];

/** What a banner can still give: every regular item the player doesn't own, and its featured item if not owned. */
export function bannerPool(banner: GachaBanner, owned: string[]): CosmeticItem[] {
  return COSMETICS.filter((item) => !owned.includes(item.id) && (!item.limited || item.id === banner.featured));
}

const percent = (share: number) => Math.round(share * 1000) / 10;

/** Drop rate of each rarity for this pool and of its limited item, in percent (0 when the pool has none of it). */
export function gachaRates(pool: CosmeticItem[]): Record<Rarity | "limited", number> {
  const regular = pool.filter((item) => !item.limited);
  const featured = pool.length > regular.length;
  const limited = !featured ? 0 : regular.length === 0 ? 1 : 1 / LIMITED_ODDS;
  const present = RARITIES.filter((rarity) => regular.some((item) => item.rarity === rarity));
  const total = present.reduce((sum, rarity) => sum + RARITY_WEIGHT[rarity], 0);
  const rates = Object.fromEntries(RARITIES.map((rarity) => [rarity, present.includes(rarity) ? percent(((1 - limited) * RARITY_WEIGHT[rarity]) / total) : 0]));
  return { ...rates, limited: percent(limited) } as Record<Rarity | "limited", number>;
}

/** Picks a rarity by weight, then an item of that rarity evenly. `roll` returns an integer in [0, max). */
export function pickFromPool(pool: CosmeticItem[], roll: (max: number) => number): CosmeticItem | null {
  const present = RARITIES.filter((rarity) => pool.some((item) => item.rarity === rarity));
  if (present.length === 0) return null;
  const total = present.reduce((sum, rarity) => sum + RARITY_WEIGHT[rarity], 0);
  let ticket = roll(total);
  const rarity = present.find((candidate) => (ticket -= RARITY_WEIGHT[candidate]) < 0)!;
  const items = pool.filter((item) => item.rarity === rarity);
  return items[roll(items.length)];
}

/** One pull: the pool's limited item at 1 in LIMITED_ODDS (or once nothing else is left), otherwise a regular pick. */
export function pickOne(pool: CosmeticItem[], roll: (max: number) => number): CosmeticItem | null {
  const featured = pool.find((item) => item.limited);
  const regular = pool.filter((item) => !item.limited);
  if (featured && (regular.length === 0 || roll(LIMITED_ODDS) === 0)) return featured;
  return pickFromPool(regular, roll);
}

/**
 * `count` different items, each picked like a single pull from what's left. In a batch, if all but the last came out
 * common, the last is picked from the rare-or-better items left. Null when the pool has fewer than `count` items.
 */
export function pickBatch(pool: CosmeticItem[], count: number, roll: (max: number) => number): CosmeticItem[] | null {
  if (count < 1 || pool.length < count) return null;
  const picked: CosmeticItem[] = [];
  let left = pool;
  for (let i = 0; i < count; i += 1) {
    const better = left.filter((item) => item.rarity !== "common");
    const guaranteed = count > 1 && i === count - 1 && picked.every((item) => item.rarity === "common") && better.length > 0;
    const item = pickOne(guaranteed ? better : left, roll)!;
    picked.push(item);
    left = left.filter((candidate) => candidate.id !== item.id);
  }
  return picked;
}
