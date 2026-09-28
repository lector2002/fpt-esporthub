"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type CosmeticItem, type Rarity, useEquipCosmetic } from "../api";
import { RARITY_LOOK } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";
import { LimitedBadge, RarityBadge } from "./cosmetic-parts";
import { CosmeticPreview, byRarity } from "./shop-item";

const CHEST = { closed: "/cosmetics/chest_closed.webp", open: "/cosmetics/chest_open.webp" };

/** Rarer pulls charge longer and burst bigger. */
const CHARGE_MS: Record<Rarity, number> = { common: 1600, rare: 2300, epic: 3200 };
const BURST_MS = 900;
const SPARKS: Record<Rarity, number> = { common: 18, rare: 30, epic: 48 };
const TWINKLES: Record<Rarity, number> = { common: 8, rare: 12, epic: 18 };
/** Light color per rarity as "r g b", read by the gacha-* classes through --gacha-rgb. */
const LIGHT: Record<Rarity, string> = { common: "251 191 36", rare: "56 189 248", epic: "217 70 239" };
const SPARK_COLORS: Record<Rarity, string[]> = {
  common: ["#fde68a", "#f59e0b", "#fff7ed"],
  rare: ["#7dd3fc", "#38bdf8", "#e0f2fe", "#fde68a"],
  epic: ["#f0abfc", "#d946ef", "#fde68a", "#a78bfa", "#fff"],
};

type Phase = "waiting" | "charging" | "burst" | "reveal";

const RANK: Record<Rarity, number> = { common: 0, rare: 1, epic: 2 };
const bestRarity = (items: CosmeticItem[]) => items.reduce<Rarity>((best, item) => (RANK[item.rarity] > RANK[best] ? item.rarity : best), "common");

/**
 * The opening in the gacha dialog: the chest rumbles until the pull returns, then charges up in the color of the best
 * rarity with light leaking from the lid, bursts open (flash, shockwaves, beam, sparks, rays) and the item rises out of
 * it. A batch deals all its items out in a grid instead, rarest first.
 */
export function GachaStage({ items, name, avatarKey, again, onDone }: { items: CosmeticItem[] | null; name: string; avatarKey: string | null; again: React.ReactNode; onDone: () => void }) {
  const { t } = useCosmeticsMessages();
  const [phase, setPhase] = useState<Phase>("waiting");
  const rarity = items ? bestRarity(items) : "common";

  useEffect(() => {
    if (!items) return;
    setPhase("charging");
    const burst = setTimeout(() => setPhase("burst"), CHARGE_MS[rarity]);
    const reveal = setTimeout(() => setPhase("reveal"), CHARGE_MS[rarity] + BURST_MS);
    return () => {
      clearTimeout(burst);
      clearTimeout(reveal);
    };
  }, [items, rarity]);

  const opened = phase === "burst" || phase === "reveal";
  const item = items?.length === 1 ? items[0] : null;
  const batch = items && items.length > 1 ? items : null;

  if (phase === "reveal" && batch) {
    return (
      <>
        <DialogHeader className="items-center text-center animate-in fade-in duration-500">
          <DialogDescription>{t("gachaTitle")}</DialogDescription>
          <DialogTitle className="text-xl" data-testid="gacha-won-count">
            {t("gachaGotCount", { count: batch.length })}
          </DialogTitle>
        </DialogHeader>
        <BatchReveal items={batch} rarity={rarity} name={name} avatarKey={avatarKey} />
        <DialogFooter className="sm:justify-center animate-in fade-in delay-700 duration-500 fill-mode-both">
          {again}
          <Button variant="outline" onClick={onDone}>
            <Check /> {t("gachaClose")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      {phase === "reveal" && item ? (
        <RevealHeader item={item} />
      ) : (
        <DialogHeader className="sr-only">
          <DialogTitle>{t("gachaOpening")}</DialogTitle>
          <DialogDescription>{t("gachaTitle")}</DialogDescription>
        </DialogHeader>
      )}
      <div
        className={cn("relative -mx-6 grid h-80 place-items-center overflow-hidden", phase === "burst" && "gacha-quake")}
        style={{ ["--gacha-rgb" as string]: LIGHT[rarity], ["--charge-ms" as string]: `${CHARGE_MS[rarity]}ms` }}
      >
        <div
          className={cn(
            "absolute inset-0 bg-radial from-[rgb(var(--gacha-rgb)/0.55)] to-transparent to-60%",
            phase === "waiting" && "opacity-15",
            phase === "charging" && "gacha-charge",
            opened && "gacha-glow",
          )}
          aria-hidden
        />
        {opened && <div className="gacha-rays absolute -inset-24" aria-hidden />}
        {opened && <div className="gacha-beam absolute bottom-24 left-1/2 h-80 w-72 -translate-x-1/2" aria-hidden />}
        <div
          className={cn(
            "absolute bottom-3 size-48 transition-[translate,scale] duration-700",
            phase === "waiting" && "gacha-rumble",
            phase === "charging" && "gacha-shake",
            phase === "burst" && "gacha-pop",
            phase === "reveal" && "translate-y-10 scale-75",
          )}
        >
          <img src={opened ? CHEST.open : CHEST.closed} alt="" aria-hidden className="size-full drop-shadow-[0_0_24px_rgb(var(--gacha-rgb)/0.8)]" />
          {phase === "charging" && <div className="gacha-seam absolute top-[53%] right-[16%] left-[8%] h-1 rounded-full bg-white" aria-hidden />}
        </div>
        {phase === "burst" && (
          <>
            <div className="gacha-flash absolute -inset-10 bg-radial from-white via-[rgb(var(--gacha-rgb)/0.5)] to-transparent to-75%" aria-hidden />
            <div className="gacha-shockwave absolute bottom-16 left-1/2 -ml-20 size-40 rounded-full border-4 border-[rgb(var(--gacha-rgb))]" aria-hidden />
            <div className="gacha-shockwave absolute bottom-16 left-1/2 -ml-20 size-40 rounded-full border-2 border-white [animation-delay:180ms]" aria-hidden />
            <Sparks rarity={rarity} />
          </>
        )}
        {phase === "reveal" && <Twinkles rarity={rarity} />}
        {phase === "reveal" && item && (
          <div className={cn("gacha-rise absolute top-6 w-full max-w-60 overflow-hidden rounded-lg border border-border bg-card shadow-2xl", RARITY_LOOK[rarity].tile)}>
            <CosmeticPreview item={item} name={name} avatarKey={avatarKey} />
          </div>
        )}
      </div>
      {phase === "reveal" && item && <RevealActions item={item} again={again} onDone={onDone} />}
    </>
  );
}

function Sparks({ rarity }: { rarity: Rarity }) {
  const colors = SPARK_COLORS[rarity];
  const count = SPARKS[rarity];
  return (
    <div className="absolute bottom-28 left-1/2" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        // Spread in a wide upward fan, alternating near and far and big and small so the burst looks full.
        const angle = Math.PI * (0.9 + (1.2 * i) / (count - 1));
        const distance = 110 + (i % 4) * 50;
        const size = [3, 5, 7][i % 3];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="gacha-spark absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
              ["--dx" as string]: `${Math.cos(angle) * distance}px`,
              ["--dy" as string]: `${Math.sin(angle) * distance}px`,
              animationDelay: `${(i % 5) * 40}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Soft points of light that keep blinking around the prize. */
function Twinkles({ rarity }: { rarity: Rarity }) {
  const colors = SPARK_COLORS[rarity];
  return (
    <div className="absolute inset-0" aria-hidden>
      {Array.from({ length: TWINKLES[rarity] }, (_, i) => {
        const size = [3, 4, 6][i % 3];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="gacha-twinkle absolute rounded-full"
            style={{
              left: `${((i * 37) % 90) + 5}%`,
              top: `${((i * 53) % 75) + 5}%`,
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 ${size * 3}px ${color}`,
              animationDelay: `${(i * 230) % 1500}ms`,
              animationDuration: `${1400 + (i % 3) * 400}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/** The batch prizes, rarest first, each rising in turn over the best rarity's glow. */
function BatchReveal({ items, rarity, name, avatarKey }: { items: CosmeticItem[]; rarity: Rarity; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  return (
    <div className="relative -mx-6 overflow-hidden px-6 py-2" style={{ ["--gacha-rgb" as string]: LIGHT[rarity] }}>
      <div className="gacha-glow absolute inset-0 bg-radial from-[rgb(var(--gacha-rgb)/0.45)] to-transparent to-70%" aria-hidden />
      <Twinkles rarity={rarity} />
      <ul className="relative grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="gacha-batch">
        {[...items].sort(byRarity).map((prize, i) => (
          <li
            key={prize.id}
            className={cn("gacha-deal overflow-hidden rounded-lg border border-border bg-card shadow-lg", RARITY_LOOK[prize.rarity].tile)}
            style={{ animationDelay: `${i * 90}ms` }}
            data-gacha-item={prize.id}
          >
            <CosmeticPreview item={prize} name={name} avatarKey={avatarKey} />
            <div className="flex flex-col items-start gap-1 px-2.5 py-2">
              <span className="w-full truncate text-sm font-medium">{t(prize.id as CosmeticsMessageKey)}</span>
              {prize.limited ? <LimitedBadge /> : <RarityBadge rarity={prize.rarity} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RevealHeader({ item }: { item: CosmeticItem }) {
  const { t } = useCosmeticsMessages();
  return (
    <DialogHeader className="items-center text-center animate-in fade-in duration-500">
      <DialogDescription>{t("gachaGot")}</DialogDescription>
      <DialogTitle className="text-xl" data-testid="gacha-won">
        {t(item.id as CosmeticsMessageKey)}
      </DialogTitle>
      <div className="flex items-center gap-2">
        <RarityBadge rarity={item.rarity} />
        {item.limited && <LimitedBadge />}
        <span className="text-xs text-muted-foreground">{t(`kind_${item.kind}`)}</span>
      </div>
    </DialogHeader>
  );
}

function RevealActions({ item, again, onDone }: { item: CosmeticItem; again: React.ReactNode; onDone: () => void }) {
  const { t } = useCosmeticsMessages();
  const equip = useEquipCosmetic();
  const useNow = () =>
    equip.mutate(
      { kind: item.kind, itemId: item.id },
      {
        onSuccess: () => {
          toast.success(t("equipped"));
          onDone();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  return (
    <DialogFooter className="sm:justify-center animate-in fade-in delay-300 duration-500 fill-mode-both">
      {again}
      <Button onClick={useNow} disabled={equip.isPending}>
        <Check /> {t("gachaUseNow")}
      </Button>
    </DialogFooter>
  );
}
