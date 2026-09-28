"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SpendButton } from "@/features/credits/components/spend-button";
import { type CosmeticItem, type CosmeticsShop, type Rarity, usePullGacha } from "../api";
import { useCosmeticsMessages } from "../messages";
import { RarityBadge } from "./cosmetic-parts";
import { CHEST, GachaStage } from "./gacha-stage";

const RARITY_ORDER: Rarity[] = ["common", "rare", "epic"];

export function GachaBox({ shop, name, avatarKey }: { shop: CosmeticsShop; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const pull = usePullGacha();
  const [won, setWon] = useState<CosmeticItem | null>(null);
  const [open, setOpen] = useState(false);
  const [pulls, setPulls] = useState(0);
  const { price, remaining, rates } = shop.gacha;

  const openBox = () => {
    setWon(null);
    setPulls((n) => n + 1);
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
      className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-amber-600/20 via-card to-orange-700/15 p-5 ring-1 ring-foreground/10 sm:p-6"
      data-testid="gacha"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img src={CHEST.closed} alt="" aria-hidden className="size-24 shrink-0 drop-shadow-[0_6px_14px_rgb(245_158_11/0.3)] sm:size-28" />
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
        <DialogContent className="overflow-hidden sm:max-w-sm">
          <GachaStage key={pulls} item={won} name={name} avatarKey={avatarKey} again={remaining > 0 && openButton} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
