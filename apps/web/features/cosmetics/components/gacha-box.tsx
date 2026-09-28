"use client";

import { useEffect, useState } from "react";
import { Check, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpendButton } from "@/features/credits/components/spend-button";
import { cn } from "@/lib/utils";
import { type CosmeticItem, type CosmeticsShop, type Rarity, useEquipCosmetic, usePullGacha } from "../api";
import { RARITY_LOOK } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";
import { RarityBadge } from "./cosmetic-parts";
import { CosmeticPreview } from "./shop-item";

const RARITY_ORDER: Rarity[] = ["common", "rare", "epic"];
/** How long the box shakes before the item shows, so the reveal reads as one. */
const REVEAL_MS = 900;

export function GachaBox({ shop, name, avatarKey }: { shop: CosmeticsShop; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const pull = usePullGacha();
  const [won, setWon] = useState<CosmeticItem | null>(null);
  const [open, setOpen] = useState(false);
  const { price, remaining, rates } = shop.gacha;

  const openBox = () => {
    setWon(null);
    setOpen(true);
    pull.mutate(undefined, {
      onSuccess: ({ item }) => setWon(item),
      onError: (error) => {
        setOpen(false);
        toast.error(error.message);
      },
    });
  };

  const openButton = (
    <SpendButton price={price} icon={Gift} label={t("gachaOpen")} confirmTitle={t("gachaConfirmTitle")} pending={pull.isPending} disabled={remaining === 0} onConfirm={openBox} />
  );

  return (
    <section
      aria-labelledby="gacha-title"
      className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-violet-600/25 via-fuchsia-500/10 to-amber-400/20 p-5 ring-1 ring-foreground/10 sm:p-6"
      data-testid="gacha"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-white shadow-lg shadow-fuchsia-500/30 sm:size-20">
          <Gift className="size-8 sm:size-10" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <h2 id="gacha-title" className="text-lg font-semibold">
              {t("gachaTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("gachaHint")}</p>
          </div>
          {remaining > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={t("gachaRates")}>
              {RARITY_ORDER.filter((rarity) => rates[rarity] > 0).map((rarity) => (
                <li key={rarity} className="flex items-center gap-1.5">
                  <RarityBadge rarity={rarity} />
                  <span className="font-medium tabular-nums">{rates[rarity]}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {openButton}
          <span className="text-xs text-muted-foreground">{remaining > 0 ? t("gachaLeft", { count: remaining }) : t("gachaDone")}</span>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          {won ? <Reveal key={won.id} item={won} name={name} avatarKey={avatarKey} again={remaining > 0 && openButton} onDone={() => setOpen(false)} /> : <Opening />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** The box glows in the color of what is inside a moment before it opens. */
const INSIDE_HINT: Record<Rarity, string> = {
  common: "",
  rare: "ring-4 ring-sky-400/70 shadow-sky-400/60",
  epic: "fx-sheen relative overflow-hidden ring-4 ring-fuchsia-400/80 shadow-fuchsia-500/70",
};

function Opening({ inside }: { inside?: Rarity }) {
  const { t } = useCosmeticsMessages();
  return (
    <>
      <DialogHeader className="sr-only">
        <DialogTitle>{t("gachaOpening")}</DialogTitle>
        <DialogDescription>{t("gachaTitle")}</DialogDescription>
      </DialogHeader>
      <div className="grid h-48 place-items-center">
        <div className={cn("grid size-24 place-items-center rounded-3xl bg-linear-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-white shadow-xl shadow-fuchsia-500/40 transition-shadow duration-500 motion-safe:animate-bounce", inside && INSIDE_HINT[inside])}>
          <Gift className="size-12" aria-hidden />
        </div>
      </div>
    </>
  );
}

function Reveal({ item, name, avatarKey, again, onDone }: { item: CosmeticItem; name: string; avatarKey: string | null; again: React.ReactNode; onDone: () => void }) {
  const { t } = useCosmeticsMessages();
  const equip = useEquipCosmetic();
  const [shown, setShown] = useState(false);
  const look = RARITY_LOOK[item.rarity];
  const label = t(item.id as CosmeticsMessageKey);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), REVEAL_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!shown) return <Opening inside={item.rarity} />;

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
    <>
      <DialogHeader className="items-center text-center">
        <DialogDescription>{t("gachaGot")}</DialogDescription>
        <DialogTitle className="text-xl" data-testid="gacha-won">
          {label}
        </DialogTitle>
        <div className="flex items-center gap-2">
          <RarityBadge rarity={item.rarity} />
          <span className="text-xs text-muted-foreground">{t(`kind_${item.kind}`)}</span>
        </div>
      </DialogHeader>
      <div className="relative grid place-items-center py-6">
        {look.rays && <div className={cn("absolute -inset-10", look.rays)} aria-hidden />}
        <div className={cn("absolute inset-0 bg-radial to-transparent to-70% motion-safe:animate-pulse", look.glow)} aria-hidden />
        <div className={cn("relative w-full max-w-60 overflow-hidden rounded-lg border border-border bg-card shadow-lg motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fade-in motion-safe:duration-500", look.tile)}>
          <CosmeticPreview item={item} name={name} avatarKey={avatarKey} />
        </div>
      </div>
      <DialogFooter className="sm:justify-center">
        {again}
        <Button onClick={useNow} disabled={equip.isPending}>
          <Check /> {t("gachaUseNow")}
        </Button>
      </DialogFooter>
    </>
  );
}
