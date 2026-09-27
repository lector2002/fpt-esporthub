/** Profile cosmetics sold for credits. Ids are stored on User and UserCosmetic; the web maps each id to its look and label. */
export const COSMETIC_KINDS = ["frame", "banner", "nameColor", "title"] as const;
export type CosmeticKind = (typeof COSMETIC_KINDS)[number];

export interface CosmeticItem {
  id: string;
  kind: CosmeticKind;
  credits: number;
}

const PRICE: Record<CosmeticKind, number> = { frame: 30, banner: 25, nameColor: 20, title: 15 };

const IDS: Record<CosmeticKind, string[]> = {
  frame: ["frame_gold", "frame_neon", "frame_ember", "frame_frost", "frame_sakura"],
  banner: ["banner_sunset", "banner_ocean", "banner_aurora", "banner_ember", "banner_night"],
  nameColor: ["name_gold", "name_cyan", "name_rose", "name_lime"],
  title: ["title_shotcaller", "title_clutch", "title_macro", "title_support", "title_one_trick", "title_chill", "title_tryhard", "title_campus_legend"],
};

export const COSMETICS: CosmeticItem[] = COSMETIC_KINDS.flatMap((kind) => IDS[kind].map((id) => ({ id, kind, credits: PRICE[kind] })));

export function findCosmetic(id: string) {
  return COSMETICS.find((item) => item.id === id) ?? null;
}

/** User column that holds the equipped item of each kind. */
export const EQUIPPED_FIELD = { frame: "frameId", banner: "bannerId", nameColor: "nameColorId", title: "titleId" } as const;

export const EQUIPPED_SELECT = { frameId: true, bannerId: true, nameColorId: true, titleId: true } as const;

type Equipped = { frameId: string | null; bannerId: string | null; nameColorId: string | null; titleId: string | null };

/** Public shape of what a user has equipped; unknown ids (removed from the catalog) show as nothing. */
export function toCosmeticsView(user: Equipped) {
  const known = (id: string | null) => (id && findCosmetic(id) ? id : null);
  return { frame: known(user.frameId), banner: known(user.bannerId), nameColor: known(user.nameColorId), title: known(user.titleId) };
}
