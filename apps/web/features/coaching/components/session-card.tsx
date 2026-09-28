"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, Clock, Coins, Hourglass, Repeat2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { useWallet } from "@/features/credits/api";
import { SpendButton } from "@/features/credits/components/spend-button";
import { creditsForVnd } from "@/features/credits/pricing";
import { cn } from "@/lib/utils";
import { type RequestAction, useCoachingRequestAction, useCounterCoachingRequest } from "../api";
import { formatDateTime, formatVnd } from "../format";
import { useCoachingMessages } from "../messages";
import type { CoachingRequest, CoachingStatus } from "../types";
import { ProposalDialog } from "./proposal-dialog";

const STATUS_TONE: Record<CoachingStatus, string> = {
  PENDING: "text-warning",
  COUNTERED: "text-warning",
  AGREED: "text-success",
  DECLINED: "text-destructive",
  CANCELLED: "text-muted-foreground",
};

const TOAST_KEY = { agree: "toastAgreed", decline: "toastDeclined", cancel: "toastCancelled", confirm: "toastConfirmed", dispute: "toastDisputed" } as const;

function isOpen(request: CoachingRequest) {
  return request.status === "PENDING" || request.status === "COUNTERED";
}

function ConfirmButton({ label, title, pending, onConfirm }: { label: string; title: string; pending: boolean; onConfirm: () => void }) {
  const { t } = useCoachingMessages();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={pending}>
          <X /> {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{t("irreversible")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SessionHeader({ request }: { request: CoachingRequest }) {
  const { t } = useCoachingMessages();
  const name = request.counterpart.displayName;
  const expired = isOpen(request) && new Date(request.proposedStartAt) <= new Date();
  return (
    <div className="flex items-start gap-3">
      <UserAvatar name={name} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {request.viewerRole === "player" ? (
          <Link href={`/coaches/${request.coachId}`} className="truncate font-semibold hover:underline">
            {name}
          </Link>
        ) : (
          <span className="truncate font-semibold">{name}</span>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <GameBadge game={request.game} />
          <Badge variant="outline" className={STATUS_TONE[request.status]}>
            {t(`status_${request.status}`)}
          </Badge>
          {expired && <Badge variant="outline">{t("expired")}</Badge>}
        </div>
      </div>
    </div>
  );
}

function ProposalSummary({ request }: { request: CoachingRequest }) {
  const { t, language } = useCoachingMessages();
  const name = request.counterpart.displayName;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {request.lastProposedByMe ? t("yourProposal") : t("theirProposal", { name })}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-4 text-muted-foreground" /> {formatDateTime(request.proposedStartAt, language)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-4 text-muted-foreground" /> {t("minutes", { count: request.durationMinutes })}
        </span>
        <span className="font-semibold text-primary">{formatVnd(request.proposedPrice)}</span>
        {request.settlement && (
          <Badge variant="outline" data-settlement={request.settlement}>
            <Coins /> {t(`settlement_${request.settlement}`, { count: request.creditHold ?? 0 })}
          </Badge>
        )}
      </div>
      {request.message && <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{request.message}</p>}
    </div>
  );
}

function SessionActions({ request }: { request: CoachingRequest }) {
  const { t } = useCoachingMessages();
  const [counterOpen, setCounterOpen] = useState(false);
  const action = useCoachingRequestAction();
  const counter = useCounterCoachingRequest();
  const name = request.counterpart.displayName;
  const pending = action.isPending || counter.isPending;
  const wallet = useWallet().data;
  const pack = wallet?.coachingInCredits ? wallet.packages[0] : undefined;
  const holdPrice = pack && request.proposedPrice > 0 ? creditsForVnd(request.proposedPrice, pack) : undefined;

  function run(kind: RequestAction) {
    action.mutate(
      { id: request.id, action: kind },
      { onSuccess: () => toast.success(t(TOAST_KEY[kind])), onError: (error) => toast.error(error.message) },
    );
  }

  const waiting = isOpen(request) && request.lastProposedByMe;
  const hasActions = request.canAgree || request.canCounter || request.canDecline || request.canCancel || request.canConfirm || request.canDispute;
  if (!hasActions && !waiting) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {waiting && (
        <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Hourglass className="size-3.5" /> {t("waiting", { name })}
        </span>
      )}
      {request.canAgree && request.viewerRole === "player" && holdPrice !== undefined ? (
        <SpendButton
          price={holdPrice}
          label={t("agree")}
          icon={Check}
          confirmTitle={t("agreeHoldTitle", { name })}
          pending={pending}
          size="sm"
          onConfirm={() => run("agree")}
        />
      ) : (
        request.canAgree && (
          <Button size="sm" disabled={pending} onClick={() => run("agree")}>
            <Check /> {t("agree")}
          </Button>
        )
      )}
      {request.canCounter && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setCounterOpen(true)}>
          <Repeat2 /> {t("counter")}
        </Button>
      )}
      {request.canDecline && (
        <ConfirmButton label={t("decline")} title={t("declineTitle", { name })} pending={pending} onConfirm={() => run("decline")} />
      )}
      {request.canCancel && (
        <ConfirmButton label={t("cancel")} title={t("cancelTitle", { name })} pending={pending} onConfirm={() => run("cancel")} />
      )}
      {request.canConfirm && (
        <Button size="sm" disabled={pending} onClick={() => run("confirm")}>
          <Check /> {t("confirmSession")}
        </Button>
      )}
      {request.canDispute && (
        <ConfirmButton label={t("reportProblem")} title={t("reportTitle", { name })} pending={pending} onConfirm={() => run("dispute")} />
      )}
      <ProposalDialog
        open={counterOpen}
        onOpenChange={setCounterOpen}
        title={t("counterTitle", { name })}
        submitLabel={t("sendCounter")}
        hourlyRate={request.coachHourlyRate}
        initial={request}
        payer={request.viewerRole === "player"}
        pending={counter.isPending}
        onSubmit={(input) =>
          counter.mutate(
            { id: request.id, ...input },
            {
              onSuccess: () => {
                setCounterOpen(false);
                toast.success(t("counterSent"));
              },
              onError: (error) => toast.error(error.message),
            },
          )
        }
      />
    </div>
  );
}

export function SessionCard({ request }: { request: CoachingRequest }) {
  return (
    <Card size="sm" className={cn(!isOpen(request) && request.status !== "AGREED" && "opacity-70")}>
      <CardContent className="flex flex-col gap-3">
        <SessionHeader request={request} />
        <ProposalSummary request={request} />
        <SessionActions request={request} />
      </CardContent>
    </Card>
  );
}
