"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, MessageSquare, Reply, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { findThread, inboxChatHref, INBOX_REQUESTS_HREF, useCreateMatchRequest, useMatchRequests } from "../api";
import { useRequestsMessages } from "../messages";
import type { MatchRequestItem } from "../types";

const MAX_MESSAGE = 280;

export interface SendRequestButtonProps {
  targetType: "player" | "team";
  targetId: string;
  targetName: string;
  className?: string;
  /** "outline" where several send buttons share a list, so the page keeps one lime primary. */
  variant?: "default" | "outline";
}

/**
 * Sends a match request to a player or team. When a pending or accepted request already exists
 * it shows that state instead (Requested / Respond / Open chat), so it is safe to render anywhere.
 */
export function SendRequestButton({ targetType, targetId, targetName, className, variant }: SendRequestButtonProps) {
  const { user } = useSession();
  const requests = useMatchRequests();
  const thread = findThread(requests.data, targetType, targetId);

  if (targetType === "player" && user?.id === targetId) return null;
  if (thread) return <ThreadState thread={thread} className={className} />;
  return <SendDialog targetType={targetType} targetId={targetId} targetName={targetName} className={className} variant={variant} />;
}

function ThreadState({ thread, className }: { thread: MatchRequestItem; className?: string }) {
  const { t } = useRequestsMessages();
  if (thread.status === "ACCEPTED") {
    return (
      <Button asChild variant="secondary" className={className}>
        <Link href={inboxChatHref(thread.conversationId)}>
          <MessageSquare /> {t("openChat")}
        </Link>
      </Button>
    );
  }
  if (thread.direction === "incoming") {
    return (
      <Button asChild className={className}>
        <Link href={INBOX_REQUESTS_HREF}>
          <Reply /> {t("respond")}
        </Link>
      </Button>
    );
  }
  return (
    <Button variant="outline" disabled className={className}>
      <Clock /> {t("requested")}
    </Button>
  );
}

function SendDialog({ targetType, targetId, targetName, className, variant }: SendRequestButtonProps) {
  const { t } = useRequestsMessages();
  const { game } = useActiveGame();
  const create = useCreateMatchRequest();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const tooLong = message.length > MAX_MESSAGE;
  const isPlayer = targetType === "player";

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (tooLong || create.isPending) return;
    const text = message.trim();
    create.mutate(
      {
        type: isPlayer ? "PLAYER_TO_PLAYER" : "PLAYER_TO_TEAM",
        ...(isPlayer ? { receiverId: targetId } : { teamId: targetId }),
        ...(text ? { message: text } : {}),
        ...(game ? { game } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t("sentToast", { name: targetName }));
          setOpen(false);
          setMessage("");
        },
        onError: (error) => toast.error(t("sendFailed"), { description: error.message }),
      },
    );
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Send /> {t(isPlayer ? "invitePlayer" : "askToJoin")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="truncate">{t(isPlayer ? "invitePlayerTo" : "askToJoinTo", { name: targetName })}</DialogTitle>
            <DialogDescription className="sr-only">{t("messageLabel")}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={tooLong || undefined}>
            <FieldLabel htmlFor={`request-message-${targetId}`}>{t("messageLabel")}</FieldLabel>
            <Textarea
              id={`request-message-${targetId}`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("messagePlaceholder")}
              aria-invalid={tooLong || undefined}
              rows={4}
            />
            {tooLong ? (
              <FieldError>{t("messageTooLong", { max: MAX_MESSAGE })}</FieldError>
            ) : (
              <FieldDescription className="text-right tabular-nums">
                {message.length}/{MAX_MESSAGE}
              </FieldDescription>
            )}
          </Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("close")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={tooLong || create.isPending}>
              {create.isPending ? <Spinner /> : <Send />}
              {create.isPending ? t("sending") : t("send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
