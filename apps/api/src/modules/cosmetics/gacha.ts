import { RARITIES, type CosmeticItem, type Rarity } from "./catalog";

/** Credits per pull. Cheaper than any item bought directly, but you don't pick what you get. */
export const GACHA_PRICE = 10;

/** Chance of each rarity when the pool has all three; rarities missing from the pool share nothing. */
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 88, rare: 10, epic: 2 };

/** Drop rate of each rarity for this pool, in percent (0 when the pool has none of it). */
export function gachaRates(pool: CosmeticItem[]): Record<Rarity, number> {
  const present = RARITIES.filter((rarity) => pool.some((item) => item.rarity === rarity));
  const total = present.reduce((sum, rarity) => sum + RARITY_WEIGHT[rarity], 0);
  return Object.fromEntries(RARITIES.map((rarity) => [rarity, present.includes(rarity) ? Math.round((RARITY_WEIGHT[rarity] / total) * 1000) / 10 : 0])) as Record<Rarity, number>;
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
