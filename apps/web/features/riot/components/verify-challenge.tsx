"use client";

import { Check, Clock, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { GameSlug } from "@/lib/contracts";
import { useConfirmVerification, useStartVerification } from "../api";
import { formatClock, riotErrorText, useNow } from "../format";
import { useRiotMessages } from "../messages";
import type { VerifyChallenge } from "../types";

export function VerifyChallengePanel({ game, riotId, challenge }: { game: GameSlug; riotId: string; challenge: VerifyChallenge }) {
  const { t } = useRiotMessages();
  const now = useNow(1000);
  const confirm = useConfirmVerification();
  const restart = useStartVerification();
  const remainingSeconds = (new Date(challenge.expiresAt).getTime() - now) / 1000;
  const expired = remainingSeconds <= 0;
  const pending = confirm.isPending || restart.isPending;

  const onConfirm = () =>
    confirm.mutate(game, {
      onSuccess: (result) => {
        const synced = result.status === "verified" && result.synced;
        if (synced) toast.success(t("toastVerified"));
        else toast.warning(t("toastVerifiedNoSync"));
      },
      onError: (error) => toast.error(riotErrorText(error, t)),
    });
  const onRestart = () =>
    restart.mutate(game, {
      onSuccess: () => toast.success(t("toastStarted")),
      onError: (error) => toast.error(riotErrorText(error, t)),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ChallengeIcon challenge={challenge} />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-medium">{t("challengeTitle")}</p>
          <p className="truncate text-sm text-muted-foreground">{riotId}</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
          </ol>
          <p className={expired ? "flex items-center gap-1.5 text-sm text-destructive" : "flex items-center gap-1.5 text-sm text-muted-foreground"}>
            <Clock className="size-4" />
            {expired ? t("expired") : t("expiresIn", { time: formatClock(remainingSeconds) })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onConfirm} disabled={pending || expired}>
          {confirm.isPending ? <Spinner /> : <Check />} {t("confirm")}
        </Button>
        <Button variant="outline" onClick={onRestart} disabled={pending}>
          {restart.isPending ? <Spinner /> : <RotateCw />} {t("restart")}
        </Button>
      </div>
    </div>
  );
}

function ChallengeIcon({ challenge }: { challenge: VerifyChallenge }) {
  const { t } = useRiotMessages();
  if (!challenge.iconUrl) {
    return (
      <div className="flex size-28 shrink-0 items-center justify-center rounded-lg border border-border text-center text-sm text-muted-foreground">
        {t("iconNumber", { id: challenge.iconId })}
      </div>
    );
  }
  return (
    <img
      src={challenge.iconUrl}
      alt={t("iconAlt", { id: challenge.iconId })}
      width={112}
      height={112}
      className="size-28 shrink-0 rounded-lg border border-border"
    />
  );
}
