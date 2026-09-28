"use client";

import { Award, Circle, Crown, Gem, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rarity } from "../api";
import { BANNER_LOOK, CARD_ART, CARD_LOOK, FRAME_ART, FRAME_LOOK, NAME_COLOR_LOOK, PET_FX, PET_SPRITE, RARITY_LOOK, TITLE_TIER } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";

/**
 * Avatar frame: an illustrated decoration drawn over the avatar at 1.5x its size (rare and epic), or a gradient ring
 * (common). The pet sits at the lower right. Renders the avatar alone without either.
 */
export function CosmeticFrame({ frame, pet, children, className }: { frame: string | null | undefined; pet?: string | null; children: React.ReactNode; className?: string }) {
  const art = frame ? FRAME_ART[frame] : undefined;
  const ring = frame && !art ? FRAME_LOOK[frame] : undefined;
  const framed = ring ? (
    <div className={cn("shrink-0 rounded-full p-[3px]", ring, className)} data-frame={frame}>
      <div className="rounded-full bg-background p-[2px]">{children}</div>
    </div>
  ) : (
    children
  );
  const petShown = Boolean(pet && PET_SPRITE[pet]);
  if (!art && !petShown) return <>{framed}</>;
  return (
    <div className={cn("relative shrink-0", art && className)} data-frame={art ? frame : undefined}>
      {framed}
      {art && <img src={art} alt="" aria-hidden className="pointer-events-none absolute -top-1/4 -left-1/4 size-[150%] max-w-none select-none" />}
      {petShown && <CosmeticPet pet={pet!} className="absolute -right-[8%] -bottom-[2%] h-[52%]" />}
    </div>
  );
}

export function CosmeticPet({ pet, className, style }: { pet: string; className?: string; style?: React.CSSProperties }) {
  const { t } = useCosmeticsMessages();
  return (
    <span
      role="img"
      aria-label={t(pet as CosmeticsMessageKey)}
      className={cn("pet-sprite relative block", PET_FX[pet], className)}
      style={{ ...style, backgroundImage: `url(${PET_SPRITE[pet]})` }}
      data-pet={pet}
    />
  );
}

export function CosmeticBanner({ banner, className }: { banner: string | null | undefined; className?: string }) {
  const look = banner ? BANNER_LOOK[banner] : undefined;
  if (!look) return null;
  return <div className={cn("h-24 w-full", look, className)} data-banner={banner} aria-hidden />;
}

/** Classes for a card wearing a card decoration; add them to the card's own className, and put `<CardDecoration>` inside it. */
export function cardLookClass(card: string | null | undefined) {
  if (!card) return undefined;
  return CARD_ART[card] ? "relative" : CARD_LOOK[card];
}

/** Illustrated card border (a 9-slice SVG) laid over the card's edges, plus the epic card's peeking pet. */
export function CardDecoration({ card, width = 28 }: { card: string | null | undefined; width?: number }) {
  const art = card ? CARD_ART[card] : undefined;
  if (!art) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit]" data-card={card}>
      <div className="absolute inset-0 border-solid" style={{ borderWidth: width, borderImage: `url(${art.src}) 40 / ${width}px round` }} />
      {art.peek && <CosmeticPet pet={art.peek} className="absolute top-0 right-[12%]" style={{ height: width * 1.7 }} />}
    </div>
  );
}

export function nameColorClass(nameColor: string | null | undefined) {
  return nameColor ? NAME_COLOR_LOOK[nameColor] : undefined;
}

const RARITY_ICON: Record<Rarity, LucideIcon> = { common: Circle, rare: Gem, epic: Crown };

/** Rare titles wear a blue badge, epic ones the moving prestige fill; common titles are plain text. */
const TITLE_BADGE = { rare: "rounded-full border border-sky-400/50 bg-sky-500/10 px-2 py-0.5 text-sky-700 dark:text-sky-300", epic: "fx-prestige fx-sheen relative overflow-hidden rounded-full px-2 py-0.5" };

export function CosmeticTitle({ title, className }: { title: string | null | undefined; className?: string }) {
  const { t } = useCosmeticsMessages();
  if (!title) return null;
  const tier = TITLE_TIER[title];
  const Icon = tier ? RARITY_ICON[tier] : Award;
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 text-xs font-medium text-primary", tier && TITLE_BADGE[tier], className)} data-title={title}>
      <Icon className="size-3.5" aria-hidden />
      {t(title as CosmeticsMessageKey)}
    </span>
  );
}

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  const { t } = useCosmeticsMessages();
  const Icon = RARITY_ICON[rarity];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", RARITY_LOOK[rarity].badge, className)} data-rarity={rarity}>
      <Icon className={cn("size-3", rarity === "common" && "size-2 fill-current")} aria-hidden />
      {t(`rarity_${rarity}`)}
    </span>
  );
}