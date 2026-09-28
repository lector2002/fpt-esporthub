"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, Coins, Flame, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CosmeticPet } from "@/features/cosmetics/components/cosmetic-parts";
import { useCosmeticsMessages, type CosmeticsMessageKey } from "@/features/cosmetics/messages";
import { cn } from "@/lib/utils";
import { useCheckIn } from "../api";
import { useCreditsMessages } from "../messages";
import type { CheckIn, Rewards } from "../types";
import { COIN_OUTLINE, SPEND_SURFACE } from "./spend-button";

/** e2e sets this so the popup doesn't cover pages and seeded balances stay exact. */
const SKIP_KEY = "fpt-esporthub-skip-check-in";

function skipCheckIn() {
  try {
    return window.localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

/** Checks in once per page load; the server gives today's reward once per Vietnam day, and only then the popup shows. */
export function DailyReward() {
  const { mutateAsync } = useCheckIn();
  const started = useRef(false);
  const [result, setResult] = useState<CheckIn | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (started.current || skipCheckIn()) return;
    started.current = true;
    mutateAsync()
      .then((checkIn) => {
        setResult(checkIn);
        setOpen(checkIn.claimed);
      })
      .catch(() => undefined);
  }, [mutateAsync]);

  if (!result) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" data-testid="daily-reward">
        <RewardBody checkIn={result} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RewardBody({ checkIn, onClose }: { checkIn: CheckIn; onClose: () => void }) {
  const { t } = useCreditsMessages();
  const { rules, streak, reward } = checkIn;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Gift className="size-5 text-coin" aria-hidden />
          {t("rewardTitle")}
        </DialogTitle>
        <DialogDescription>{t("rewardToday")}</DialogDescription>
      </DialogHeader>

      <div className={cn("rounded-lg border p-4", SPEND_SURFACE)}>
        <p className="flex items-center gap-2 text-3xl font-bold text-coin tabular-nums" data-testid="daily-reward-amount">
          <Coins className="size-7" aria-hidden />+{reward}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {reward > rules.daily ? t("rewardStreakBonus", { count: rules.every }) : t("rewardStreak", { count: streak })}
        </p>
        <StreakSteps rewards={checkIn} className="mt-3" />
      </div>

      <RewardPerks rewards={checkIn} topUpLink onNavigate={onClose} />

      <p className="text-xs text-muted-foreground">{t("rewardNote")}</p>
      <DialogFooter>
        <Button onClick={onClose}>{t("rewardDone")}</Button>
      </DialogFooter>
    </>
  );
}

/** Same rewards on the wallet page, for anyone who closed the popup. */
export function RewardsCard({ rewards }: { rewards: Rewards }) {
  const { t } = useCreditsMessages();
  return (
    <Card data-testid="rewards-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="size-5 text-coin" aria-hidden />
          {t("rewardTitle")}
        </CardTitle>
        <CardDescription>{t("rewardStreak", { count: rewards.streak })}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <StreakSteps rewards={rewards} />
        <RewardPerks rewards={rewards} />
        <p className="text-xs text-muted-foreground">{t("rewardNote")}</p>
      </CardContent>
    </Card>
  );
}

/** One step per day of the streak cycle; the last carries the bonus. */
export function StreakSteps({ rewards, className }: { rewards: Rewards; className?: string }) {
  const { t } = useCreditsMessages();
  const { rules, streak } = rewards;
  // Where the streak sits in the current cycle, 0..every (0 = no streak).
  const step = streak === 0 ? 0 : ((streak - 1) % rules.every) + 1;
  return (
    <ol className={cn("grid grid-cols-5 gap-1.5", className)} aria-label={t("rewardStreak", { count: streak })}>
      {Array.from({ length: rules.every }, (_, index) => {
        const done = index < step;
        const bonus = index === rules.every - 1;
        return (
          <li
            key={index}
            className={cn(
              "flex h-9 items-center justify-center rounded-md border text-xs font-semibold tabular-nums",
              done ? "border-coin bg-coin text-coin-foreground" : "border-border bg-muted text-muted-foreground",
            )}
          >
            {bonus ? `+${rules.bonus}` : done ? <Check className="size-4" aria-hidden /> : index + 1}
          </li>
        );
      })}
    </ol>
  );
}

/** The three perks. `topUpLink` adds a link to the wallet on the first top-up perk while the pet isn't owned. */
export function RewardPerks({ rewards, topUpLink, onNavigate }: { rewards: Rewards; topUpLink?: boolean; onNavigate?: () => void }) {
  const { t } = useCreditsMessages();
  const cosmetics = useCosmeticsMessages();
  const { rules, firstTopUpPet } = rewards;
  const owned = (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Check className="size-4" aria-hidden />
      {t("rewardOwned")}
    </span>
  );
  const topUp = topUpLink && (
    <Button asChild size="sm" variant="outline" className={COIN_OUTLINE} onClick={onNavigate}>
      <Link href="/wallet">{t("rewardTopUp")}</Link>
    </Button>
  );
  return (
    <ul className="grid gap-3">
      <Perk icon={<CalendarCheck className="size-5" aria-hidden />} title={t("rewardDaily")} hint={t("rewardDailyHint", { count: rules.daily })} />
      <Perk icon={<Flame className="size-5" aria-hidden />} title={t("rewardBonus", { count: rules.every })} hint={t("rewardBonusHint", { count: rules.bonus })} />
      <Perk
        icon={<CosmeticPet pet={firstTopUpPet.id} className="h-10" />}
        title={t("rewardFirstTopUp")}
        hint={t("rewardFirstTopUpHint", { pet: cosmetics.t(firstTopUpPet.id as CosmeticsMessageKey) })}
        action={firstTopUpPet.owned ? owned : topUp}
      />
    </ul>
  );
}

function Perk({ icon, title, hint, action }: { icon: React.ReactNode; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-coin">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      {action}
    </li>
  );
}
