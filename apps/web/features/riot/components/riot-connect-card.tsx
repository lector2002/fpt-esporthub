"use client";

import { useState } from "react";
import { BadgeCheck, CircleCheck, Link2, RefreshCw, ShieldQuestion, Unlink, X } from "lucide-react";
import { toast } from "sonner";
import { QueryState } from "@/components/common/query-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { GameSlug } from "@/lib/contracts";
import { useRiotStats, useStartVerification, useSyncStats, useUnlinkRiot } from "../api";
import { formatClock, formatRelativeTime, profileIconUrl, riotErrorText, useNow } from "../format";
import { useRiotMessages } from "../messages";
import type { OwnRiotStats } from "../types";
import { RiotSearch } from "./riot-search";
import { VerifyChallengePanel } from "./verify-challenge";

/** Riot account linking for one game, shown inside the profile's Riot section. */
export function RiotConnectPanel({ game }: { game: GameSlug }) {
  const query = useRiotStats(game);
  const [justLinked, setJustLinked] = useState<string | null>(null);

  return (
    <QueryState query={query} skeleton={<Skeleton className="h-24 w-full" />}>
      {(data) => {
        if (data.status === "requires_rso") return <RsoNote />;
        if (data.status === "unlinked") return <RiotSearch game={game} suggestedRiotId={data.riotId} onLinked={setJustLinked} />;
        return (
          <div className="flex flex-col gap-4">
            {justLinked && <LinkedNotice riotId={justLinked} onDismiss={() => setJustLinked(null)} />}
            <LinkedPanel game={game} data={data} />
          </div>
        );
      }}
    </QueryState>
  );
}

/** Shown right after linking so the player knows it worked and what comes next. */
function LinkedNotice({ riotId, onDismiss }: { riotId: string; onDismiss: () => void }) {
  const { t } = useRiotMessages();
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t("linkedNoticeTitle", { riotId })}</p>
        <p className="text-muted-foreground">{t("linkedNoticeText")}</p>
      </div>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onDismiss} aria-label={t("dismiss")}>
        <X />
      </Button>
    </div>
  );
}

export function RsoNote() {
  const { t } = useRiotMessages();
  return (
    <div className="flex items-start gap-3 text-sm">
      <ShieldQuestion className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium">{t("rsoTitle")}</p>
        <p className="text-muted-foreground">{t("rsoDescription")}</p>
      </div>
    </div>
  );
}

function LinkedPanel({ game, data }: { game: GameSlug; data: OwnRiotStats }) {
  const { t, language } = useRiotMessages();
  const now = useNow(1000);
  const sync = useSyncStats();
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const cooldownSeconds = data.nextSyncAt ? (new Date(data.nextSyncAt).getTime() - now) / 1000 : 0;
  const coolingDown = cooldownSeconds > 0;
  const verified = data.status === "verified";
  const iconUrl = data.stats && data.ddragonVersion ? profileIconUrl(data.ddragonVersion, data.stats.profileIconId) : null;

  const onSync = () =>
    sync.mutate(game, {
      onSuccess: () => toast.success(t("toastSynced")),
      onError: (error) => toast.error(riotErrorText(error, t)),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {iconUrl && <img src={iconUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-md border border-border" />}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium">
              {verified ? <BadgeCheck className="size-4 shrink-0 text-success" /> : <Link2 className="size-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{data.riotId}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {verified ? t("verifiedTitle") : t("linkedTitle")} ·{" "}
              {data.syncedAt ? t("syncedAt", { time: formatRelativeTime(data.syncedAt, language, now) }) : t("notSynced")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSync} disabled={sync.isPending || coolingDown}>
              {sync.isPending ? <Spinner /> : <RefreshCw />} {t("sync")}
            </Button>
            <Button variant="ghost" onClick={() => setUnlinkOpen(true)}>
              <Unlink /> {t("unlink")}
            </Button>
          </div>
          {coolingDown && <span className="text-xs text-muted-foreground">{t("syncIn", { time: formatClock(cooldownSeconds) })}</span>}
        </div>
      </div>
      {!verified &&
        (data.challenge && data.riotId ? (
          <VerifyChallengePanel game={game} riotId={data.riotId} challenge={data.challenge} />
        ) : (
          <VerifyPrompt game={game} />
        ))}
      <UnlinkDialog game={game} open={unlinkOpen} onOpenChange={setUnlinkOpen} />
    </div>
  );
}

function VerifyPrompt({ game }: { game: GameSlug }) {
  const { t } = useRiotMessages();
  const start = useStartVerification();
  const onStart = () =>
    start.mutate(game, {
      onSuccess: () => toast.success(t("toastStarted")),
      onError: (error) => toast.error(riotErrorText(error, t)),
    });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 text-sm text-muted-foreground">{t("verifyHint")}</p>
      <Button onClick={onStart} disabled={start.isPending} className="shrink-0">
        {start.isPending ? <Spinner /> : <BadgeCheck />} {t("verify")}
      </Button>
    </div>
  );
}

function UnlinkDialog({ game, open, onOpenChange }: { game: GameSlug; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useRiotMessages();
  const unlink = useUnlinkRiot();

  const onConfirm = (event: React.MouseEvent) => {
    event.preventDefault();
    unlink.mutate(game, {
      onSuccess: () => {
        toast.success(t("toastUnlinked"));
        onOpenChange(false);
      },
      onError: (error) => toast.error(riotErrorText(error, t)),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !unlink.isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("unlinkTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("unlinkDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={unlink.isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={unlink.isPending} onClick={onConfirm}>
            {unlink.isPending && <Spinner />} {t("unlink")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
