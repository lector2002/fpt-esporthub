"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Gem, Gift } from "lucide-react";
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
const BIG = "h-12 w-full px-6 text-base @xl:w-auto";

/** `?banner=` picks the banner so a limited one can be linked to; the standard box (first) is the default. `step` wraps around. */
function useBanner(banners: GachaBanner[]) {
  const router = useRouter();
  const fromQuery = useSearchParams().get("banner");
  const banner = banners.find((candidate) => candidate.id === fromQuery) ?? banners[0];
  const step = (by: number) => {
    const next = banners[(banners.indexOf(banner) + by + banners.length) % banners.length];
    router.replace(next === banners[0] ? "/shop" : `/shop?banner=${next.id}`, { scroll: false });
  };
  return [banner, step] as const;
}

/** The mystery box tab: a big banner with open x1 / x10, arrows on its sides to switch banner; rates and the pool sit behind Details. */
export function GachaBox({ shop, name, avatarKey }: { shop: CosmeticsShop; name: string; avatarKey: string | null }) {
  const { t } = useCosmeticsMessages();
  const pull = usePullGacha();
  const [banner, stepBanner] = useBanner(shop.gacha.banners);
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
    <>
      <section aria-labelledby="gacha-title" className="@container relative isolate overflow-hidden rounded-2xl bg-[#1a120b] ring-1 ring-foreground/10" data-testid="gacha" data-banner-id={banner.id}>
        <img key={banner.id} src={GACHA_ART[banner.id]?.bg} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover object-[68%_50%] animate-in fade-in duration-500" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/90 via-black/35 to-black/0" aria-hidden />
        <div className="absolute inset-0 -z-10 hidden bg-linear-to-r from-black/60 via-black/10 to-black/0 @xl:block" aria-hidden />
        {featured && GACHA_ART[banner.id]?.featured && (
          <span
            role="img"
            aria-label={featuredName}
            className={cn("pet-sprite absolute top-14 right-[16%] h-32 @xl:h-40 @4xl:top-auto @4xl:right-[18%] @4xl:bottom-[26%] @4xl:h-60 @6xl:h-72", PET_FX[featured.id], rates.limited === 0 && "opacity-60 grayscale")}
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
        {shop.gacha.banners.length > 1 && (
          <>
            <BannerArrow side="left" label={t("gachaPrev")} onClick={() => stepBanner(-1)} />
            <BannerArrow side="right" label={t("gachaNext")} onClick={() => stepBanner(1)} />
          </>
        )}
        <div className="flex min-h-[34rem] flex-col justify-end gap-5 p-6 text-white @xl:min-h-[36rem] @4xl:min-h-[40rem] @4xl:py-10 @4xl:pr-10 @4xl:pl-20">
          <div className="flex max-w-xl flex-col gap-3">
            <h2 id="gacha-title" className="text-4xl font-bold tracking-tight @xl:text-5xl @4xl:text-6xl">
              {featured ? t("gachaLimitedTitle", { pet: featuredName }) : t("gachaTitle")}
            </h2>
            <p className="text-white/80 @4xl:text-lg">
              {!featured ? t("gachaHint") : rates.limited > 0 ? t("gachaLimitedHint", { pet: featuredName, rate: rates.limited }) : t("gachaLimitedOwned", { pet: featuredName })}
            </p>
          </div>
          <div className="grid gap-4 @xl:flex @xl:items-end">
            {openButton(1, BIG)}
            <div className="relative pt-3 @xl:pt-0">
              <span
                className={cn(
                  "absolute -top-0.5 left-3 z-10 flex items-center gap-1 rounded-md bg-sky-500 px-2 py-0.5 text-xs font-semibold text-white shadow @xl:-top-3.5",
                  remaining < batch && "hidden",
                )}
              >
                <Gem className="size-3.5" aria-hidden /> {t("gachaGuarantee")}
              </span>
              {openButton(batch, cn(BIG, "@xl:h-14 @xl:px-8 @xl:text-lg"))}
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
    </>
  );
}

/** Round arrow on one side of the banner; high on a narrow banner so it clears the title and the featured pet. */
function BannerArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-[30%] z-10 grid size-10 place-items-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 @4xl:top-1/2 @4xl:size-12 @4xl:-translate-y-1/2",
        side === "left" ? "left-2 @4xl:left-4" : "right-2 @4xl:right-4",
      )}
    >
      <Icon className="size-6" aria-hidden />
    </button>
  );
}
