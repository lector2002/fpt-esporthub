"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Gift, Globe, MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatShortDate } from "@/features/coaching/format";
import { useCosmetics } from "@/features/cosmetics/api";
import { GACHA_ART } from "@/features/cosmetics/looks";
import { useCosmeticsMessages, type CosmeticsMessageKey } from "@/features/cosmetics/messages";
import { RewardPerks, StreakSteps } from "@/features/credits/components/daily-reward";
import { useWallet } from "@/features/credits/api";
import { useCreditsMessages } from "@/features/credits/messages";
import { useEvents } from "@/features/events/api";
import { useOfflineTournaments } from "@/features/offline-tournaments/api";
import { useOfflineMessages } from "@/features/offline-tournaments/messages";
import { useActiveGame } from "@/lib/game";
import { cn } from "@/lib/utils";

/** Cups that are still worth showing: open, checking in or being played. */
const RUNNING = ["REGISTRATION", "CHECK_IN", "LIVE"];
const MAX_TOURNAMENTS = 4;

/** Gold tab on the right edge of every page; opens a panel with the login rewards and what's on right now. */
export function RewardsDrawer() {
  const { t } = useCreditsMessages();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("drawerOpen")}
        data-testid="rewards-drawer-tab"
        className="fixed top-1/2 right-0 z-40 flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-coin/50 bg-coin text-coin-foreground shadow-lg transition-[width] hover:w-9 focus-visible:w-9 focus-visible:outline-none"
      >
        <Gift className="size-4" aria-hidden />
      </button>
      <SheetContent side="right" className="w-[88%] gap-0 overflow-y-auto sm:max-w-sm" data-testid="rewards-drawer">
        {open && <DrawerBody onNavigate={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useCreditsMessages();
  const rewards = useWallet().data?.rewards;
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Gift className="size-5 text-coin" aria-hidden />
          {t("drawerTitle")}
        </SheetTitle>
        <SheetDescription>{t("drawerHint")}</SheetDescription>
      </SheetHeader>
      <div className="flex min-w-0 flex-col gap-6 px-4 pb-6">
        {rewards && (
          <section className="flex min-w-0 flex-col gap-3" aria-label={t("rewardTitle")}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{t("rewardTitle")}</h3>
              <span className="text-xs text-muted-foreground">{t("rewardStreak", { count: rewards.streak })}</span>
            </div>
            <StreakSteps rewards={rewards} />
            <RewardPerks rewards={rewards} topUpLink onNavigate={onNavigate} />
            <p className="text-xs text-muted-foreground">{t("rewardNote")}</p>
          </section>
        )}
        <section className="flex min-w-0 flex-col gap-2" aria-label={t("drawerEvents")}>
          <h3 className="font-semibold">{t("drawerEvents")}</h3>
          <LimitedBanners onNavigate={onNavigate} />
          <OpenTournaments onNavigate={onNavigate} />
        </section>
      </div>
    </>
  );
}

function LimitedBanners({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useCreditsMessages();
  const cosmetics = useCosmeticsMessages();
  const banners = useCosmetics().data?.gacha.banners.filter((banner) => banner.featured) ?? [];
  return banners.map((banner) => {
    const owned = banner.rates.limited === 0;
    return (
      <EventRow
        key={banner.id}
        href={`/shop?banner=${banner.id}`}
        onNavigate={onNavigate}
        art={
          <span className="relative block size-12 shrink-0 overflow-hidden rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${GACHA_ART[banner.id]?.bg})` }}>
            {GACHA_ART[banner.id]?.featured && (
              <span className={cn("pet-sprite absolute inset-x-0 bottom-0 mx-auto h-10", owned && "opacity-60 grayscale")} style={{ backgroundImage: `url(${GACHA_ART[banner.id]?.featured})` }} />
            )}
          </span>
        }
        title={t("drawerBanner", { pet: cosmetics.t(banner.featured as CosmeticsMessageKey) })}
        hint={owned ? t("drawerBannerOwned") : t("drawerBannerRate", { rate: banner.rates.limited })}
      />
    );
  });
}

type TournamentRow = { id: string; href: string; title: string; startsAt: string; place: string; online: boolean };

function OpenTournaments({ onNavigate }: { onNavigate: () => void }) {
  const { t, language } = useCreditsMessages();
  const offline = useOfflineMessages();
  const { game } = useActiveGame();
  const online = useEvents(game, "upcoming", true).data ?? [];
  const cups = useOfflineTournaments(game).data ?? [];
  const rows: TournamentRow[] = [
    ...online
      .filter((event) => event.registrationOpen)
      .map((event) => ({ id: event.id, href: `/events/${event.id}`, title: event.title, startsAt: event.startsAt, place: t("drawerOnline"), online: true })),
    ...cups
      .filter((cup) => RUNNING.includes(cup.status))
      .map((cup) => ({
        id: cup.id,
        href: `/tournaments/${cup.id}`,
        title: cup.title,
        startsAt: cup.startsAt,
        place: `${cup.venue.name} · ${offline.t(`status_${cup.status}` as Parameters<typeof offline.t>[0])}`,
        online: false,
      })),
  ]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, MAX_TOURNAMENTS);

  return (
    <>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("drawerNoEvents")}</p>}
      {rows.map((row) => (
        <EventRow
          key={row.id}
          href={row.href}
          onNavigate={onNavigate}
          art={
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
              {row.online ? <Globe className="size-5" aria-hidden /> : <MapPin className="size-5" aria-hidden />}
            </span>
          }
          title={row.title}
          hint={`${formatShortDate(row.startsAt, language)} · ${row.place}`}
        />
      ))}
      <Link href="/events" onClick={onNavigate} className="text-sm font-medium text-primary hover:underline">
        {t("drawerAllEvents")}
      </Link>
    </>
  );
}

function EventRow({ href, art, title, hint, onNavigate }: { href: string; art: React.ReactNode; title: string; hint: string; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted">
      {art}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
