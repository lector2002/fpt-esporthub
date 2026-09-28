"use client";

import { Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/features/coaching/format";
import { usePromotionError } from "@/features/credits/components/promotions";
import { SPEND_SURFACE, SpendButton } from "@/features/credits/components/spend-button";
import { cn } from "@/lib/utils";
import { useBuyPremium, usePremium } from "../api";
import { useGuidesMessages } from "../messages";

const INCLUDES = ["includeOptions", "includeLateItems", "includeMatchups"] as const;

/** Premium pass status with the buy / extend button. `compact`: one line for a page header; otherwise a card listing what it unlocks. */
export function PremiumCard({ id, compact = false, className }: { id?: string; compact?: boolean; className?: string }) {
  const { t, language } = useGuidesMessages();
  const premium = usePremium();
  const buy = useBuyPremium();
  const onError = usePromotionError();
  const price = premium.data?.price;
  const until = premium.data?.premiumUntil;

  const action = price && (
    <SpendButton
      price={price.credits}
      label={t(until ? "extendPremium" : "buyPremium")}
      icon={Crown}
      confirmTitle={t("premiumConfirmTitle", { days: price.days })}
      pending={buy.isPending}
      size={compact ? "sm" : "default"}
      // mutateAsync: the card unmounts once the guide refetches as premium, which would drop mutate()'s onSuccess.
      onConfirm={() => buy.mutateAsync().then(() => toast.success(t("premiumBought")), onError)}
    />
  );

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-3", className)} data-testid="premium-card">
        <span className={cn("inline-flex items-center gap-1.5 pl-1.5 text-sm font-medium", until ? "text-success" : "text-foreground")}>
          <Crown className="size-4" aria-hidden /> {until ? t("premiumActive", { time: formatDateTime(until, language) }) : t("premiumTitle")}
        </span>
        {action}
      </div>
    );
  }

  return (
    <Card id={id} className={cn("scroll-mt-20", SPEND_SURFACE, className)} data-testid="premium-card">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Crown className="size-6 shrink-0 text-coin" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t("premiumTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {until ? t("premiumActive", { time: formatDateTime(until, language) }) : price ? t("premiumHint", { days: price.days }) : null}
          </p>
          {!until && (
            <ul className="mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
              {INCLUDES.map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <Check className="size-4 text-primary" aria-hidden /> {t(key)}
                </li>
              ))}
            </ul>
          )}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
