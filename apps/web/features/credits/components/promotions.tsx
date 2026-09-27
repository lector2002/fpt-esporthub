"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/features/coaching/format";
import { ApiError } from "@/lib/api-client";
import type { GameSlug } from "@/lib/contracts";
import { useBoostProfile, useFeatureTeam, useWallet } from "../api";
import { useCreditsMessages } from "../messages";
import { SpendButton } from "./spend-button";

function isActive(until: string | null | undefined) {
  return Boolean(until && new Date(until) > new Date());
}

/** Short on credits: say so and offer the wallet, otherwise show the API's message. */
export function usePromotionError() {
  const { t } = useCreditsMessages();
  const router = useRouter();
  return (error: Error) => {
    if (error instanceof ApiError && error.status === 409) {
      toast.error(t("notEnough"), { action: { label: t("goTopUp"), onClick: () => router.push("/wallet") } });
    } else toast.error(error.message);
  };
}

/** Own card on the dashboard: price and duration up front, a confirm step before spending, top-up link when short. */
export function BoostProfileCard({ game, boostedUntil }: { game: GameSlug; boostedUntil: string | null | undefined }) {
  const { t, language } = useCreditsMessages();
  const wallet = useWallet().data;
  const boost = useBoostProfile();
  const onError = usePromotionError();
  const price = wallet?.promotions.boost;
  const active = isActive(boostedUntil);

  return (
    <Card size="sm" data-testid="boost-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-4 text-muted-foreground" aria-hidden /> {t("boostTitle")}
        </CardTitle>
        {price && <CardDescription>{t("boostHint", { hours: price.hours, price: price.credits })}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {active && boostedUntil && <p className="text-sm text-success">{t("boostedUntil", { time: formatDateTime(boostedUntil, language) })}</p>}
        <SpendButton
          price={price?.credits}
          label={t("boost")}
          icon={Rocket}
          confirmTitle={price ? t("boostConfirmTitle", { hours: price.hours }) : ""}
          pending={boost.isPending}
          variant="outline"
          size="sm"
          className="self-start"
          onConfirm={() => boost.mutate(game, { onSuccess: () => toast.success(t("boostDone")), onError })}
        />
      </CardContent>
    </Card>
  );
}

export function FeatureTeamPanel({ teamId, featuredUntil, recruitmentOpen }: { teamId: string; featuredUntil: string | null; recruitmentOpen: boolean }) {
  const { t, language } = useCreditsMessages();
  const wallet = useWallet().data;
  const feature = useFeatureTeam(teamId);
  const onError = usePromotionError();
  const price = wallet?.promotions.feature;
  const active = isActive(featuredUntil);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Megaphone className="size-4 text-primary" aria-hidden />
        {t("featureTitle")}
      </div>
      {price && <p className="text-xs text-muted-foreground">{t("featureHint", { hours: price.hours, price: price.credits })}</p>}
      {active && featuredUntil && <p className="text-xs text-success">{t("featuredUntil", { time: formatDateTime(featuredUntil, language) })}</p>}
      <div className="flex items-center gap-2">
        <SpendButton
          price={price?.credits}
          label={t("feature")}
          icon={Megaphone}
          confirmTitle={price ? t("featureConfirmTitle", { hours: price.hours }) : ""}
          pending={feature.isPending}
          disabled={!recruitmentOpen}
          variant="outline"
          size="sm"
          className="flex-1"
          onConfirm={() => feature.mutate(undefined, { onSuccess: () => toast.success(t("featureDone")), onError })}
        />
        {wallet && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/wallet">{t("credits", { count: wallet.balance })}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function PromotedBadge({ kind }: { kind: "boosted" | "featured" }) {
  const { t } = useCreditsMessages();
  const Icon = kind === "boosted" ? Rocket : Megaphone;
  return (
    <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
      <Icon className="size-3" aria-hidden />
      {t(kind)}
    </Badge>
  );
}
