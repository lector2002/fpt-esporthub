"use client";

import { useState } from "react";
import { Backpack, Check, Coins, Gift, type LucideIcon, Percent, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SpendButton } from "@/features/credits/components/spend-button";
import { cn } from "@/lib/utils";
import { type CosmeticItem, type CosmeticsShop, type Rarity, usePullGacha } from "../api";
import { RARITY_LOOK } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";
import { RarityBadge } from "./cosmetic-parts";
import { GachaStage } from "./gacha-stage";
import { CosmeticPreview } from "./shop-item";

/** Rarest first, like the shop lists. */
const RARITY_ORDER: Rarity[] = ["epic", "rare", "common"];
const HALL = "/cosmetics/gacha_hall.webp";

type Share = { rarity: Rarity; rate: number; left: number; total: number };

/** The mystery box tab: hero with the open button, drop rates, the rules, and everything the box can still give. */
export function GachaBox({ shop, name, avatarKey }: { shop: CosmeticsShop; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const pull = usePullGacha();
  const [won, setWon] = useState<CosmeticItem | null>(null);
  const [open, setOpen] = useState(false);
  const [pulls, setPulls] = useState(0);
  const { price, remaining, rates } = shop.gacha;
  // The server's rates are over the items this player doesn't own, so the counts below use the same pool.
  const shares: Share[] = RARITY_ORDER.map((rarity) => {
    const items = shop.catalog.filter((item) => item.rarity === rarity);
    return { rarity, rate: rates[rarity], total: items.length, left: items.filter((item) => !shop.owned.includes(item.id)).length };
  });

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
    <div className="flex flex-col gap-6">
      <section aria-labelledby="gacha-title" className="relative isolate overflow-hidden rounded-xl bg-[#1a120b] ring-1 ring-foreground/10" data-testid="gacha">
        <img src={HALL} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover object-[70%_50%]" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 via-black/60 to-black/10 sm:bg-linear-to-r sm:from-black/85 sm:via-black/55 sm:to-black/0" aria-hidden />
        <div className="flex min-h-96 flex-col justify-end gap-4 p-6 text-white sm:p-8 lg:max-w-xl lg:justify-center">
          <span className="flex items-center gap-1.5 text-sm font-medium text-amber-200">
            <Sparkles className="size-4" aria-hidden /> {t("gachaPerOpen", { price })}
          </span>
          <h2 id="gacha-title" className="text-3xl font-bold sm:text-4xl">
            {t("gachaTitle")}
          </h2>
          <p className="text-white/80 sm:text-lg">{t("gachaHint")}</p>
          {remaining > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label={t("gachaRates")}>
              {shares
                .filter((share) => share.rate > 0)
                .map((share) => (
                  <li key={share.rarity} className="flex items-center gap-1.5">
                    <RarityBadge rarity={share.rarity} />
                    <span className="font-semibold tabular-nums">{share.rate}%</span>
                  </li>
                ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {openButton}
            <span className="text-sm text-white/75">{remaining > 0 ? t("gachaLeft", { count: remaining }) : t("gachaDone")}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RatesCard shares={shares} />
        <RulesCard price={price} />
      </div>

      <PoolSection shop={shop} shares={shares} name={name} avatarKey={avatarKey} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden sm:max-w-sm">
          <GachaStage key={pulls} item={won} name={name} avatarKey={avatarKey} again={remaining > 0 && openButton} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RatesCard({ shares }: { shares: Share[] }) {
  const { t } = useCosmeticsMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("gachaRates")}</CardTitle>
        <CardDescription>{t("gachaRuleRates")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("gachaRarity")}</TableHead>
              <TableHead className="text-right">{t("gachaChance")}</TableHead>
              <TableHead className="text-right">{t("gachaItemsLeft")}</TableHead>
              <TableHead className="text-right">{t("gachaPerItem")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.map((share) => (
              <TableRow key={share.rarity} data-rarity={share.rarity}>
                <TableCell>
                  <RarityBadge rarity={share.rarity} />
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{share.rate}%</TableCell>
                <TableCell className="text-right tabular-nums">
                  {share.left}/{share.total}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{share.left > 0 ? `${(share.rate / share.left).toFixed(2)}%` : "–"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RulesCard({ price }: { price: number }) {
  const { t } = useCosmeticsMessages();
  const rules: { icon: LucideIcon; text: string }[] = [
    { icon: Coins, text: t("gachaRuleCost", { price }) },
    { icon: ShieldCheck, text: t("gachaRuleNoDupes") },
    { icon: Percent, text: t("gachaRuleRates") },
    { icon: Backpack, text: t("gachaRuleLocker") },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("gachaRulesTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {rules.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3 text-sm">
              <Icon className="mt-0.5 size-4 shrink-0 text-coin" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Every item in the box by rarity; owned ones are faded because they can't drop again. */
function PoolSection({ shop, shares, name, avatarKey }: { shop: CosmeticsShop; shares: Share[]; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  return (
    <section className="flex flex-col gap-4" aria-labelledby="gacha-pool">
      <div>
        <h2 id="gacha-pool" className="font-semibold">
          {t("gachaPoolTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("gachaPoolHint")}</p>
      </div>
      {shares.map((share) => (
        <div key={share.rarity} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RarityBadge rarity={share.rarity} />
            <span className="text-xs text-muted-foreground tabular-nums">{t("gachaLeft", { count: share.left })}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {shop.catalog
              .filter((item) => item.rarity === share.rarity)
              .map((item) => {
                const owned = shop.owned.includes(item.id);
                return (
                  <div key={item.id} className={cn("overflow-hidden rounded-lg border border-border bg-card", RARITY_LOOK[item.rarity].tile, owned && "opacity-40")} data-pool-item={item.id}>
                    <CosmeticPreview item={item} name={name} avatarKey={avatarKey} />
                    <div className="flex items-center gap-1.5 px-3 pt-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t(item.id as CosmeticsMessageKey)}</span>
                      {owned && <Check className="size-4 shrink-0 text-muted-foreground" aria-label={t("alreadyOwned")} />}
                    </div>
                    <p className="px-3 pb-2 text-xs text-muted-foreground">{t(`kind_${item.kind}`)}</p>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </section>
  );
}
