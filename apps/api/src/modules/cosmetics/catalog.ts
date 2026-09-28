/** Profile cosmetics sold for credits. Ids are stored on User and UserCosmetic; the web maps each id to its look and label. */
export const COSMETIC_KINDS = ["frame", "banner", "nameColor", "title", "card", "pet"] as const;
export type CosmeticKind = (typeof COSMETIC_KINDS)[number];

/** Rare items are animated, epic ones add motion, glow and a prestige badge; the gacha weights each rarity. */
export const RARITIES = ["common", "rare", "epic"] as const;
export type Rarity = (typeof RARITIES)[number];

export interface CosmeticItem {
  id: string;
  kind: CosmeticKind;
  credits: number;
  rarity: Rarity;
}

/** Common price per kind; rare and epic cost more, so the gacha is the cheap way to chase them. */
const PRICE: Record<CosmeticKind, number> = { frame: 30, banner: 25, nameColor: 20, title: 15, card: 30, pet: 40 };
const RARITY_MULTIPLIER: Record<Rarity, number> = { common: 1, rare: 1.5, epic: 2 };

const IDS: Record<CosmeticKind, Record<Rarity, string[]>> = {
  frame: {
    common: ["frame_frost", "frame_sakura", "frame_mint", "frame_violet"],
    rare: ["frame_gold", "frame_ember", "frame_jade", "frame_thunder"],
    epic: ["frame_neon", "frame_dragon"],
  },
  banner: {
    common: ["banner_sunset", "banner_ocean", "banner_forest", "banner_dusk"],
    rare: ["banner_ember", "banner_night", "banner_sakura", "banner_arena"],
    epic: ["banner_aurora", "banner_dragon"],
  },
  nameColor: {
    common: ["name_rose", "name_lime", "name_sky", "name_amber"],
    rare: ["name_cyan", "name_violet", "name_ember"],
    epic: ["name_gold", "name_aurora"],
  },
  title: {
    common: ["title_shotcaller", "title_macro", "title_support", "title_one_trick", "title_chill", "title_carry", "title_warder"],
    rare: ["title_clutch", "title_tryhard", "title_pentakill", "title_ace"],
    epic: ["title_campus_legend", "title_immortal"],
  },
  card: {
    common: ["card_frost", "card_carbon", "card_mint", "card_dusk"],
    rare: ["card_gold", "card_ember", "card_jade", "card_storm"],
    epic: ["card_neon", "card_dragon"],
  },
  pet: {
    common: ["pet_corgibyte", "pet_pixpanda", "pet_honeybara", "pet_clockshiba", "pet_mochimi"],
    rare: ["pet_vantacat", "pet_yukitsune", "pet_noctcrow", "pet_crystolotl"],
    epic: ["pet_neonwyrm", "pet_solara"],
  },
};

/** Rounded to 5 credits. */
const priceOf = (kind: CosmeticKind, rarity: Rarity) => Math.ceil((PRICE[kind] * RARITY_MULTIPLIER[rarity]) / 5) * 5;

export const COSMETICS: CosmeticItem[] = COSMETIC_KINDS.flatMap((kind) =>
  RARITIES.flatMap((rarity) => IDS[kind][rarity].map((id) => ({ id, kind, rarity, credits: priceOf(kind, rarity) }))),
);

export function findCosmetic(id: string) {
  return COSMETICS.find((item) => item.id === id) ?? null;
}

/** User column that holds the equipped item of each kind. */
export const EQUIPPED_FIELD = { frame: "frameId", banner: "bannerId", nameColor: "nameColorId", title: "titleId", card: "cardId", pet: "petId" } as const;

export const EQUIPPED_SELECT = { frameId: true, bannerId: true, nameColorId: true, titleId: true, cardId: true, petId: true } as const;

type Equipped = { frameId: string | null; bannerId: string | null; nameColorId: string | null; titleId: string | null; cardId: string | null; petId: string | null };

/** Public shape of what a user has equipped; unknown ids (removed from the catalog) show as nothing. */
export function toCosmeticsView(user: Equipped) {
  const known = (id: string | null) => (id && findCosmetic(id) ? id : null);
  return { frame: known(user.frameId), banner: known(user.bannerId), nameColor: known(user.nameColorId), title: known(user.titleId), card: known(user.cardId), pet: known(user.petId) };
}
