"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { GameBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { inboxChatHref, useRequestAction } from "../api";
import { useRequestsMessages } from "../messages";
import { formatRelativeTime } from "../relative-time";
import type { MatchRequestItem, MatchRequestStatus, MatchRequestType, RequestAction } from "../types";

const STATUS_TONE: Record<MatchRequestStatus, string> = {
  PENDING: "text-warning",
  ACCEPTED: "text-success",
  DECLINED: "text-muted-foreground",
  CANCELLED: "text-muted-foreground",
};

const CONTEXT = {
  PLAYER_TO_PLAYER: { incoming: "ctxPlayInvite", outgoing: "ctxPlayInviteSent" },
  PLAYER_TO_TEAM: { incoming: "ctxJoinAsk", outgoing: "ctxJoinAskSent" },
  TEAM_TO_PLAYER: { incoming: "ctxTeamInvite", outgoing: "ctxTeamInviteSent" },
} as const satisfies Record<MatchRequestType, Record<MatchRequestItem["direction"], string>>;

function profileHref(request: MatchRequestItem) {
  const { kind, id } = request.counterpart;
  return kind === "team" ? `/teams/${id}` : `/players/${id}`;
}

/** Says what the request is ("Xin vào Phoenix", "Mời bạn chơi cùng"). `muted` greys out resolved requests. */
export function RequestCard({ request, muted = false }: { request: MatchRequestItem; muted?: boolean }) {
  const { t, language } = useRequestsMessages();
  const { counterpart } = request;
  const context = t(CONTEXT[request.type][request.direction], { team: request.team?.name ?? counterpart.name });

  return (
    <Card className={cn("flex flex-row flex-wrap items-start gap-3 p-4", muted && "opacity-60")}>
      <UserAvatar name={counterpart.name} imageKey={counterpart.imageKey} kind={counterpart.kind} className="size-10" />
      <div className="min-w-0 flex-1 basis-48 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={profileHref(request)} className="truncate font-medium hover:underline">
            {counterpart.name}
          </Link>
          {request.game && <GameBadge game={request.game} />}
          {request.status !== "PENDING" && (
            <Badge variant="outline" className={STATUS_TONE[request.status]}>
              {t(`status_${request.status}`)}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {context} · <time dateTime={request.createdAt}>{formatRelativeTime(request.createdAt, language)}</time>
        </p>
        {request.message && <p className="text-sm break-words whitespace-pre-line">{request.message}</p>}
      </div>
      <RequestActions request={request} />
    </Card>
  );
}

function RequestActions({ request }: { request: MatchRequestItem }) {
  const { t } = useRequestsMessages();
  const router = useRouter();
  const mutation = useRequestAction();

  const run = (action: RequestAction) =>
    mutation.mutate(
      { id: request.id, action },
      {
        onSuccess: ({ request: updated }) => {
          if (action === "accept") {
            toast.success(t("accepted"), {
              action: { label: t("openChat"), onClick: () => router.push(inboxChatHref(updated.conversationId)) },
            });
          } else {
            toast.success(t(action === "decline" ? "declined" : "cancelled"));
          }
        },
        onError: (error) => toast.error(t("actionFailed"), { description: error.message }),
      },
    );

  if (request.status === "ACCEPTED") {
    return (
      <Button asChild size="sm" variant="secondary" className="self-start">
        <Link href={inboxChatHref(request.conversationId)}>
          <MessageSquare /> {t("openChat")}
        </Link>
      </Button>
    );
  }
  if (request.status !== "PENDING") return null;

  const name = request.counterpart.name;
  if (request.direction === "outgoing") {
    return (
      <ConfirmButton
        label={t("cancel")}
        title={t("cancelTitle", { name })}
        confirmLabel={t("confirmCancel")}
        backLabel={t("back")}
        disabled={mutation.isPending}
        onConfirm={() => run("cancel")}
      />
    );
  }
  return (
    <div className="flex gap-2 self-start">
      <Button size="sm" disabled={mutation.isPending} onClick={() => run("accept")}>
        <Check /> {t("accept")}
      </Button>
      <ConfirmButton
        label={t("decline")}
        title={t("declineTitle", { name })}
        confirmLabel={t("confirmDecline")}
        backLabel={t("back")}
        disabled={mutation.isPending}
        onConfirm={() => run("decline")}
      />
    </div>
  );
}

interface ConfirmButtonProps {
  label: string;
  title: string;
  confirmLabel: string;
  backLabel: string;
  disabled: boolean;
  onConfirm: () => void;
}

function ConfirmButton({ label, title, confirmLabel, backLabel, disabled, onConfirm }: ConfirmButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} className="self-start">
          <X /> {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{backLabel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
