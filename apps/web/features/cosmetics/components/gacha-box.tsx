"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gem, Gift } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SpendButton } from "@/features/credits/components/spend-button";
import { cn } from "@/lib/utils";
import { type CosmeticItem, type CosmeticsShop, type GachaBanner, type Rarity, usePullGacha } from "../api";
import { GACHA_ART, PET_FX } from "../looks";
import { type CosmeticsMessageKey, useCosmeticsMessages } from "../messages";
import { LimitedBadge } from "./cosmetic-parts";
import { GachaInfo, type Share } from "./gacha-info";
import { GachaStage } from "./gacha-stage";

/** Rarest first, like the shop lists. */
const RARITY_ORDER: Rarity[] = ["epic", "rare", "common"];
const BIG = "h-12 w-full px-6 text-base sm:w-auto";

/** `?banner=` picks the banner so a limited one can be linked to; the standard box (first) is the default. */
function useBanner(banners: GachaBanner[]) {
  const router = useRouter();
  const fromQuery = useSearchParams().get("banner");
  const banner = banners.find((candidate) => candidate.id === fromQuery) ?? banners[0];
  const setBanner = (id: string) => router.replace(id === banners[0].id ? "/shop" : `/shop?banner=${id}`, { scroll: false });
  return [banner, setBanner] as const;
}

/** The mystery box tab: banner picker, then a big banner with open x1 / x10; rates and the pool sit behind Details. */
export function GachaBox({ shop, name, avatarKey }: { shop: CosmeticsShop; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const pull = usePullGacha();
  const [banner, setBanner] = useBanner(shop.gacha.banners);
  const [won, setWon] = useState<CosmeticItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [pulls, setPulls] = useState(0);
  const [count, setCount] = useState(1);
  const { price, batch } = shop.gacha;
  const { remaining, rates } = banner;
  const featured = shop.catalog.find((item) => item.id === banner.featured) ?? null;
  const featuredName = featured ? t(featured.id as CosmeticsMessageKey) : "";
  // The server's rates are over what this banner can still give the player, so the counts use the same pool.
  const shares: Share[] = RARITY_ORDER.map((rarity) => {
    const items = shop.catalog.filter((item) => item.rarity === rarity && !item.limited);
    return { rarity, rate: rates[rarity], total: items.length, left: items.filter((item) => !shop.owned.includes(item.id)).length };
  });

  const openBox = (n: number) => {
    setWon(null);
    setCount(n);
    setPulls((p) => p + 1);
    setOpen(true);
    pull.mutate(
      { banner: banner.id, count: n },
      {
        onSuccess: ({ items }) => setWon(items),
        onError: (error) => {
          setOpen(false);
          toast.error(error.message);
        },
      },
    );
  };

  const openButton = (n: number, className?: string) => (
    <SpendButton
      price={price * n}
      icon={Gift}
      label={t("gachaOpen", { count: n })}
      confirmTitle={n === 1 ? t("gachaConfirmTitle") : t("gachaConfirmBatch", { count: n })}
      pending={pull.isPending}
      disabled={remaining < n}
      onConfirm={() => openBox(n)}
      className={className}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <BannerPicker banners={shop.gacha.banners} selected={banner.id} onSelect={setBanner} />

      <section aria-labelledby="gacha-title" className="relative isolate overflow-hidden rounded-2xl bg-[#1a120b] ring-1 ring-foreground/10" data-testid="gacha" data-banner-id={banner.id}>
        <img key={banner.id} src={GACHA_ART[banner.id]?.bg} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover object-[68%_50%] animate-in fade-in duration-500" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 via-black/35 to-black/0" aria-hidden />
        <div className="absolute inset-0 -z-10 hidden bg-linear-to-r from-black/60 via-black/10 to-black/0 sm:block" aria-hidden />
        {featured && GACHA_ART[banner.id]?.featured && (
          <span
            role="img"
            aria-label={featuredName}
            className={cn("pet-sprite absolute top-14 right-[8%] h-32 sm:top-auto sm:right-[18%] sm:bottom-[26%] sm:h-60 lg:h-72", PET_FX[featured.id], rates.limited === 0 && "opacity-60 grayscale")}
            style={{ backgroundImage: `url(${GACHA_ART[banner.id].featured})` }}
          />
        )}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {featured && (
            <>
              <LimitedBadge className="text-xs" />
              {rates.limited > 0 && <span className="rounded-md bg-black/50 px-2 py-0.5 text-xs font-semibold text-amber-200 tabular-nums backdrop-blur">{rates.limited}%</span>}
            </>
          )}
        </div>
        <GachaInfo shop={shop} banner={banner} shares={shares} featured={featured} name={name} avatarKey={avatarKey} className="absolute top-4 right-4" />
        <div className="flex min-h-[34rem] flex-col justify-end gap-5 p-6 text-white sm:min-h-[36rem] sm:p-10 lg:min-h-[40rem]">
          <div className="flex max-w-xl flex-col gap-3">
            <h2 id="gacha-title" className="text-4xl font-bold tracking-tight sm:text-6xl">
              {featured ? t("gachaLimitedTitle", { pet: featuredName }) : t("gachaTitle")}
            </h2>
            <p className="text-white/80 sm:text-lg">
              {!featured ? t("gachaHint") : rates.limited > 0 ? t("gachaLimitedHint", { pet: featuredName, rate: rates.limited }) : t("gachaLimitedOwned", { pet: featuredName })}
            </p>
          </div>
          <div className="grid gap-4 sm:flex sm:items-end">
            {openButton(1, BIG)}
            <div className="relative pt-3 sm:pt-0">
              <span
                className={cn(
                  "absolute -top-0.5 left-3 z-10 flex items-center gap-1 rounded-md bg-sky-500 px-2 py-0.5 text-xs font-semibold text-white shadow sm:-top-3.5",
                  remaining < batch && "hidden",
                )}
              >
                <Gem className="size-3.5" aria-hidden /> {t("gachaGuarantee")}
              </span>
              {openButton(batch, cn(BIG, "sm:h-14 sm:px-8 sm:text-lg"))}
            </div>
          </div>
          <p className="text-sm text-white/75">
            {remaining === 0 ? t("gachaDone") : remaining < batch ? `${t("gachaLeft", { count: remaining })} · ${t("gachaBatchNeeds", { count: batch })}` : t("gachaLeft", { count: remaining })}
          </p>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={count > 1 ? "max-h-[90svh] overflow-x-hidden overflow-y-auto sm:max-w-3xl" : "overflow-hidden sm:max-w-sm"}>
          <GachaStage key={pulls} items={won} name={name} avatarKey={avatarKey} again={remaining >= count && openButton(count)} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** One thumbnail per banner; limited ones carry the badge. */
function BannerPicker({ banners, selected, onSelect }: { banners: GachaBanner[]; selected: string; onSelect: (id: string) => void }) {
  const { t } = useCosmeticsMessages();
  return (
    <div className="-mx-4 overflow-x-auto overflow-y-hidden px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-1">
      <ul className="flex w-max gap-3" aria-label={t("gachaBanners")}>
        {banners.map((banner) => {
          const active = banner.id === selected;
          const label = banner.featured ? t("gachaLimitedTitle", { pet: t(banner.featured as CosmeticsMessageKey) }) : t("gachaTitle");
          return (
            <li key={banner.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(banner.id)}
                className={cn(
                  "relative isolate flex h-20 w-44 items-end overflow-hidden rounded-xl p-2.5 text-left text-sm font-semibold text-white ring-1 ring-foreground/10 transition sm:h-24 sm:w-56",
                  active ? "ring-2 ring-coin" : "opacity-70 hover:opacity-100",
                )}
              >
                <img src={GACHA_ART[banner.id]?.bg} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover" />
                <span className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 to-black/0" aria-hidden />
                {banner.featured && <LimitedBadge className="absolute top-2 left-2" />}
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
