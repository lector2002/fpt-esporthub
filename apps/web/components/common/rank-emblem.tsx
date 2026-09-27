import type { GameSlug } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const LOL_TIERS = ["iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"];
const VALORANT_TIERS = ["iron", "bronze", "silver", "gold", "platinum", "diamond", "ascendant", "immortal"];

/** Official rank emblem in `/public/ranks` (LoL: one per tier; Valorant: one per tier and level). Null when unranked or unknown. */
export function rankEmblemUrl(game: GameSlug, tier: string | null | undefined, level?: number | null) {
  const key = tier?.trim().toLowerCase() ?? "";
  if (game === "league_of_legends") return LOL_TIERS.includes(key) ? `/ranks/lol/${key}.webp` : null;
  if (key === "radiant") return "/ranks/valorant/radiant.webp";
  return VALORANT_TIERS.includes(key) ? `/ranks/valorant/${key}-${level ?? 1}.webp` : null;
}

/** Decorative: the rank is always written next to it. */
export function RankEmblem({ game, tier, level, className }: { game: GameSlug; tier: string | null | undefined; level?: number | null; className?: string }) {
  const src = rankEmblemUrl(game, tier, level);
  if (!src) return null;
  return <img src={src} alt="" loading="lazy" className={cn("size-6 shrink-0 object-contain", className)} />;
}
