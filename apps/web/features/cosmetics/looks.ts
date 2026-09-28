/**
 * How each catalog id looks. Ids come from the API (apps/api cosmetics/catalog.ts); unknown ids render as nothing.
 * Rare and epic frames, cards and banners are illustrated SVGs in public/cosmetics (animated inside the SVG); the rest
 * are Tailwind or the `fx-*` classes in ./fx.css.
 */
export const FRAME_LOOK: Record<string, string> = {
  frame_frost: "bg-linear-to-br from-sky-100 via-cyan-400 to-blue-600",
  frame_sakura: "bg-linear-to-br from-pink-100 via-pink-400 to-rose-500",
};

/** Drawn over the avatar at 1.5x its size; the avatar circle is the middle two thirds of the art. */
export const FRAME_ART: Record<string, string> = {
  frame_gold: "/cosmetics/frame_gold.svg",
  frame_ember: "/cosmetics/frame_ember.svg",
  frame_neon: "/cosmetics/frame_neon.svg",
};

export const BANNER_LOOK: Record<string, string> = {
  banner_sunset: "bg-linear-to-r from-orange-400 via-rose-500 to-purple-600",
  banner_ocean: "bg-linear-to-r from-cyan-500 via-sky-600 to-indigo-700",
  banner_ember: "bg-[url(/cosmetics/banner_ember.svg)] bg-cover bg-center",
  banner_night: "bg-[url(/cosmetics/banner_night.svg)] bg-cover bg-center",
  banner_aurora: "bg-[url(/cosmetics/banner_aurora.svg)] bg-cover bg-center",
};

/** Common card decoration: classes added to the whole card. */
export const CARD_LOOK: Record<string, string> = {
  card_frost: "ring-2 ring-sky-300/70 shadow-lg shadow-sky-400/20 bg-linear-to-b from-sky-300/15 via-card to-card",
  card_carbon:
    "ring-2 ring-zinc-400/50 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.035)_0_6px,transparent_6px_12px)]",
};

/** Illustrated card borders: a 120px SVG cut into a 9-slice at 40px (see CardDecoration). */
export const CARD_ART: Record<string, { src: string }> = {
  card_gold: { src: "/cosmetics/card_gold.svg" },
  card_ember: { src: "/cosmetics/card_ember.svg" },
  card_neon: { src: "/cosmetics/card_neon.svg" },
};

export const NAME_COLOR_LOOK: Record<string, string> = {
  name_rose: "text-rose-600 dark:text-rose-400",
  name_lime: "text-lime-700 dark:text-lime-400",
  name_cyan: "text-cyan-700 drop-shadow-[0_0_6px_rgb(34_211_238/0.55)] dark:text-cyan-300",
  name_gold: "fx-name-gold",
};

/** Titles above common get a badge; the rest show as plain text. */
export const TITLE_TIER: Record<string, "rare" | "epic"> = {
  title_clutch: "rare",
  title_tryhard: "rare",
  title_campus_legend: "epic",
};

/** Idle sprite strip (6 frames side by side) under public/pets; see public/pets/LICENSE.txt. */
export const PET_SPRITE: Record<string, string> = {
  pet_corgibyte: "/pets/corgibyte.webp",
  pet_pixpanda: "/pets/pixpanda.webp",
  pet_honeybara: "/pets/honeybara.webp",
  pet_vantacat: "/pets/vantacat.webp",
  pet_yukitsune: "/pets/yukitsune.webp",
  pet_neonwyrm: "/pets/neonwyrm.webp",
};

export const PET_FX: Record<string, string> = {
  pet_vantacat: "fx-pet-halo [--fx-glow:rgb(167_139_250/0.85)]",
  pet_yukitsune: "fx-pet-halo [--fx-glow:rgb(103_232_249/0.85)]",
  pet_neonwyrm: "fx-pet-sparkle [--fx-glow:rgb(34_211_238/0.9)]",
};

/** Rarity badge, shop tile edge, and the glow and rays behind a gacha reveal. */
export const RARITY_LOOK: Record<"common" | "rare" | "epic", { badge: string; tile: string; wash: string; glow: string; rays: string }> = {
  common: { badge: "bg-muted text-muted-foreground", tile: "", wash: "bg-muted/40", glow: "from-zinc-400/40", rays: "" },
  rare: {
    badge: "bg-linear-to-r from-sky-500 to-cyan-400 text-white shadow-sm shadow-sky-500/40",
    tile: "border-sky-400/50 shadow-md shadow-sky-500/10",
    wash: "bg-linear-to-br from-sky-500/15 via-muted/40 to-cyan-400/10",
    glow: "from-sky-400/50",
    rays: "fx-rays [--fx-ray:rgb(56_189_248/0.3)]",
  },
  epic: {
    badge: "fx-prestige fx-sheen relative overflow-hidden",
    tile: "fx-edge-epic shadow-lg shadow-fuchsia-500/15",
    wash: "bg-linear-to-br from-fuchsia-500/20 via-violet-500/10 to-amber-400/15",
    glow: "from-fuchsia-500/60",
    rays: "fx-rays [--fx-ray:rgb(217_70_239/0.38)]",
  },
};
