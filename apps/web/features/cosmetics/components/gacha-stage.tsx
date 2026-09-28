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
import { RarityBadge } from "./cosmetic-parts";
import { CosmeticPreview } from "./shop-item";

export const CHEST = { closed: "/cosmetics/chest_closed.webp", open: "/cosmetics/chest_open.webp" };

/** Rarer pulls shake longer and throw more sparks. */
const SHAKE_MS: Record<Rarity, number> = { common: 700, rare: 1000, epic: 1500 };
const SPARKS: Record<Rarity, number> = { common: 10, rare: 18, epic: 30 };
const BURST_MS = 450;
const SPARK_COLORS: Record<Rarity, string[]> = {
  common: ["#fde68a", "#f59e0b", "#fff7ed"],
  rare: ["#7dd3fc", "#38bdf8", "#e0f2fe", "#fde68a"],
  epic: ["#f0abfc", "#d946ef", "#fde68a", "#a78bfa", "#fff"],
};
const HINT_GLOW: Record<Rarity, string> = {
  common: "drop-shadow-[0_0_16px_rgb(245_158_11/0.55)]",
  rare: "drop-shadow-[0_0_22px_rgb(56_189_248/0.9)]",
  epic: "drop-shadow-[0_0_28px_rgb(217_70_239/0.95)]",
};

type Phase = "waiting" | "shaking" | "burst" | "reveal";

/**
 * The opening in the gacha dialog: the chest rumbles until the pull returns, shakes harder in the rarity's color,
 * bursts open in a flash of sparks, and the item rises out of it.
 */
export function GachaStage({ item, name, avatarKey, again, onDone }: { item: CosmeticItem | null; name: string; avatarKey: string | null; again: React.ReactNode; onDone: () => void }) {
  const { t } = useCosmeticsMessages();
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    if (!item) return;
    setPhase("shaking");
    const burst = setTimeout(() => setPhase("burst"), SHAKE_MS[item.rarity]);
    const reveal = setTimeout(() => setPhase("reveal"), SHAKE_MS[item.rarity] + BURST_MS);
    return () => {
      clearTimeout(burst);
      clearTimeout(reveal);
    };
  }, [item]);

  const rarity = item?.rarity ?? "common";
  const opened = phase === "burst" || phase === "reveal";

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
      <div className="relative -mx-6 grid h-72 place-items-center overflow-hidden">
        {opened && RARITY_LOOK[rarity].rays && <div className={cn("absolute -inset-16", RARITY_LOOK[rarity].rays)} aria-hidden />}
        <div className={cn("absolute inset-0 bg-radial to-transparent to-65% transition-opacity duration-700", RARITY_LOOK[rarity].glow, phase === "waiting" ? "opacity-0" : "opacity-100")} aria-hidden />
        <img
          src={opened ? CHEST.open : CHEST.closed}
          alt=""
          aria-hidden
          className={cn(
            "absolute bottom-2 size-44 transition-[filter,translate,scale] duration-500",
            phase === "waiting" && "gacha-rumble",
            phase === "shaking" && cn("gacha-shake", HINT_GLOW[rarity]),
            opened && HINT_GLOW[rarity],
            phase === "reveal" && "translate-y-6 scale-90",
          )}
          style={{ ["--shake-ms" as string]: `${SHAKE_MS[rarity]}ms` }}
        />
        {phase === "burst" && (
          <>
            <div className="gacha-flash absolute inset-0 bg-radial from-white via-white/70 to-transparent to-70%" aria-hidden />
            <Sparks rarity={rarity} />
          </>
        )}
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
    <div className="absolute bottom-20 left-1/2" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        // Spread upward in a fan, alternating near and far so the burst looks full.
        const angle = Math.PI * (1.05 + (0.9 * i) / (count - 1));
        const distance = 90 + (i % 3) * 45;
        return (
          <span
            key={i}
            className="gacha-spark absolute size-2 rounded-full"
            style={{
              background: colors[i % colors.length],
              boxShadow: `0 0 8px ${colors[i % colors.length]}`,
              ["--dx" as string]: `${Math.cos(angle) * distance}px`,
              ["--dy" as string]: `${Math.sin(angle) * distance}px`,
              animationDelay: `${(i % 4) * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function RevealHeader({ item }: { item: CosmeticItem }) {
  const { t } = useCosmeticsMessages();
  return (
    <DialogHeader className="items-center text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <DialogDescription>{t("gachaGot")}</DialogDescription>
      <DialogTitle className="text-xl" data-testid="gacha-won">
        {t(item.id as CosmeticsMessageKey)}
      </DialogTitle>
      <div className="flex items-center gap-2">
        <RarityBadge rarity={item.rarity} />
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
    <DialogFooter className="sm:justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:delay-300 motion-safe:duration-500 motion-safe:fill-mode-both">
      {again}
      <Button onClick={useNow} disabled={equip.isPending}>
        <Check /> {t("gachaUseNow")}
      </Button>
    </DialogFooter>
  );
}
