"use client";

import { Backpack, Check, Coins, Gem, Info, type LucideIcon, Percent, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CosmeticItem, CosmeticsShop, GachaBanner, Rarity } from "../api";
import { RARITY_LOOK } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";
import { LimitedBadge, RarityBadge } from "./cosmetic-parts";
import { CosmeticPreview } from "./shop-item";

export type Share = { rarity: Rarity; rate: number; left: number; total: number };

type InfoProps = { shop: CosmeticsShop; banner: GachaBanner; shares: Share[]; featured: CosmeticItem | null; name: string; avatarKey: string | null };

/** The Details button on a banner: drop rates and rules in one tab, everything the banner holds in the other. */
export function GachaInfo({ className, ...props }: InfoProps & { className?: string }) {
  const { shop, banner } = props;
  const { t } = useCosmeticsMessages();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("border-white/25 bg-black/40 text-white backdrop-blur hover:bg-black/60 hover:text-white", className)}>
          <Info /> {t("gachaInfo")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("gachaTitle")}</DialogTitle>
          <DialogDescription>{t("gachaLeft", { count: banner.remaining })}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="rates" className="gap-4">
          <TabsList variant="line">
            <TabsTrigger value="rates">
              <Percent /> {t("gachaRates")}
            </TabsTrigger>
            <TabsTrigger value="pool">
              <Gem /> {t("gachaPoolTitle")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rates" className="flex flex-col gap-6">
            <RatesTable {...props} />
            <Rules price={shop.gacha.price} batch={shop.gacha.batch} />
          </TabsContent>
          <TabsContent value="pool">
            <Pool {...props} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RatesTable({ shop, banner, shares, featured }: InfoProps) {
  const { t } = useCosmeticsMessages();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("gachaRuleRates")}</p>
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
          {featured && (
            <TableRow data-rarity="limited">
              <TableCell>
                <LimitedBadge />
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{banner.rates.limited}%</TableCell>
              <TableCell className="text-right tabular-nums">{shop.owned.includes(featured.id) ? 0 : 1}/1</TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">{banner.rates.limited > 0 ? `${banner.rates.limited.toFixed(2)}%` : "–"}</TableCell>
            </TableRow>
          )}
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
    </div>
  );
}

function Rules({ price, batch }: { price: number; batch: number }) {
  const { t } = useCosmeticsMessages();
  const rules: { icon: LucideIcon; text: string }[] = [
    { icon: Coins, text: t("gachaRuleCost", { price }) },
    { icon: Gem, text: t("gachaRuleBatch", { count: batch, price: price * batch }) },
    { icon: ShieldCheck, text: t("gachaRuleNoDupes") },
    { icon: Backpack, text: t("gachaRuleLocker") },
  ];
  return (
    <section className="flex flex-col gap-3" aria-labelledby="gacha-rules">
      <h3 id="gacha-rules" className="font-semibold">
        {t("gachaRulesTitle")}
      </h3>
      <ul className="flex flex-col gap-3">
        {rules.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3 text-sm">
            <Icon className="mt-0.5 size-4 shrink-0 text-coin" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Everything the banner holds, its limited item first then by rarity; owned ones are faded because they can't drop again. */
function Pool({ shop, shares, featured, name, avatarKey }: InfoProps) {
  const { t } = useCosmeticsMessages();
  const tiles = (items: CosmeticItem[]) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <PoolTile key={item.id} item={item} owned={shop.owned.includes(item.id)} name={name} avatarKey={avatarKey} />
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("gachaPoolHint")}</p>
      {featured && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LimitedBadge />
            <span className="text-xs text-muted-foreground">{t("gachaLimitedPet")}</span>
          </div>
          {tiles([featured])}
        </div>
      )}
      {shares.map((share) => (
        <div key={share.rarity} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RarityBadge rarity={share.rarity} />
            <span className="text-xs text-muted-foreground tabular-nums">{t("gachaLeft", { count: share.left })}</span>
          </div>
          {tiles(shop.catalog.filter((item) => item.rarity === share.rarity && !item.limited))}
        </div>
      ))}
    </div>
  );
}

function PoolTile({ item, owned, name, avatarKey }: { item: CosmeticItem; owned: boolean; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", RARITY_LOOK[item.rarity].tile, owned && "opacity-40")} data-pool-item={item.id}>
      <CosmeticPreview item={item} name={name} avatarKey={avatarKey} />
      <div className="flex items-center gap-1.5 px-3 pt-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{t(item.id as CosmeticsMessageKey)}</span>
        {owned && <Check className="size-4 shrink-0 text-muted-foreground" aria-label={t("alreadyOwned")} />}
      </div>
      <p className="px-3 pb-2 text-xs text-muted-foreground">{t(`kind_${item.kind}`)}</p>
    </div>
  );
}
