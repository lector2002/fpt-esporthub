import type { GameSlug } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const SPLASH = "https://ddragon.leagueoflegends.com/cdn/img/champion/centered";

/** Official LoL splash art for a Data Dragon champion id, e.g. "LeeSin". */
export const championSplashUrl = (champion: string) => `${SPLASH}/${encodeURIComponent(champion)}_0.jpg`;

// Fallback art for players with no mains and no synced match, picked by user id so it never changes between visits.
const RANDOM_CHAMPIONS = [
  "Ahri", "Akali", "Ashe", "Caitlyn", "Darius", "Ekko", "Ezreal", "Garen", "Irelia", "Jinx", "Kaisa", "Katarina", "LeeSin", "Leona",
  "Lux", "MissFortune", "Morgana", "Nami", "Orianna", "Pyke", "Riven", "Sett", "Sylas", "Thresh", "Vi", "Viego", "Yasuo", "Yone", "Zed",
];
const RANDOM_AGENTS = [
  "astra", "breach", "chamber", "clove", "cypher", "fade", "gekko", "harbor", "jett", "kayo", "killjoy", "neon", "omen",
  "phoenix", "raze", "reyna", "sage", "skye", "sova", "viper", "yoru",
];

function pick<T>(list: T[], seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return list[hash % list.length];
}

/**
 * Card art for a player: favourite main, else the champion from their latest LoL match, else a stable random pick.
 * LoL uses splash art, Valorant the agent banners in `/public/art`.
 */
export function playerArtUrl(game: GameSlug, player: { mains: string[]; recentChampion?: string | null }, seed: string) {
  if (game === "league_of_legends") return championSplashUrl(player.mains[0] ?? player.recentChampion ?? pick(RANDOM_CHAMPIONS, seed));
  return `/art/valorant/${encodeURIComponent(player.mains[0] ?? pick(RANDOM_AGENTS, seed))}.webp`;
}

/**
 * Decorative banner picture fading into the surface below (`fade`).
 * Without a picture it falls back to a plain accent wash, so card heights stay even.
 */
export function SplashBanner({
  src,
  fade = "from-card",
  className,
}: {
  src: string | null | undefined;
  fade?: "from-card" | "from-background";
  className?: string;
}) {
  return (
    <div className={cn("relative h-24 overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-card", className)} aria-hidden>
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="size-full object-cover object-[center_25%]"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      <div className={cn("absolute inset-0 bg-gradient-to-t via-transparent to-transparent", fade)} />
    </div>
  );
}
