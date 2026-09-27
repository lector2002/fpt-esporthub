"use client";

import { useLayoutEffect, useRef } from "react";
import { EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/user-avatar";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "../format";
import { useChatMessages } from "../messages";
import type { ChatMessage } from "../types";

const GROUP_GAP_MS = 5 * 60 * 1000;

interface MessageGroup {
  key: string;
  senderId: string;
  startedAt: string;
  messages: ChatMessage[];
}

/** Consecutive messages from the same sender within a few minutes share one bubble stack and timestamp. */
function groupMessages(messages: ChatMessage[]) {
  const groups: MessageGroup[] = [];
  for (const message of messages) {
    const last = groups.at(-1);
    const previous = last?.messages.at(-1);
    const sameRun =
      last &&
      previous &&
      last.senderId === message.senderId &&
      new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_GAP_MS;
    if (sameRun) last.messages.push(message);
    else groups.push({ key: message.id, senderId: message.senderId, startedAt: message.createdAt, messages: [message] });
  }
  return groups;
}

interface MessageListProps {
  messages: ChatMessage[];
  meId: string | undefined;
  /** Sender label for incoming messages. */
  nameOf: (senderId: string) => string;
  /** Uploaded avatar per sender, shown in the room layout. */
  avatarOf?: (senderId: string) => string | null | undefined;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  /** Senders the viewer blocked: their messages collapse to a placeholder (team rooms). */
  hiddenSenderIds?: string[];
  /** "bubbles": own messages on the right. "room": everyone on the left with an avatar, like a Discord channel. */
  layout?: "bubbles" | "room";
  className?: string;
}

export function MessageList({
  messages,
  meId,
  nameOf,
  avatarOf,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  hiddenSenderIds,
  layout = "bubbles",
  className,
}: MessageListProps) {
  const { t, language } = useChatMessages();
  const scrollRef = useRef<HTMLDivElement>(null);
  const edges = useRef<{ first?: string; last?: string; fromBottom?: number }>({});
  const firstId = messages[0]?.id;
  const lastId = messages.at(-1)?.id;

  // New message at the bottom: stick to the bottom. Older page prepended: keep the reading position.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const prev = edges.current;
    if (lastId !== prev.last) el.scrollTop = el.scrollHeight;
    else if (firstId !== prev.first && prev.fromBottom !== undefined) el.scrollTop = el.scrollHeight - prev.fromBottom;
    edges.current = { first: firstId, last: lastId };
  }, [firstId, lastId]);

  const loadOlder = () => {
    const el = scrollRef.current;
    if (el) edges.current.fromBottom = el.scrollHeight - el.scrollTop;
    onLoadOlder();
  };

  return (
    <div ref={scrollRef} className={cn("flex-1 overflow-y-auto px-3 py-4", className)}>
      {hasOlder && (
        <div className="mb-3 flex justify-center">
          <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder && <Loader2 className="animate-spin" />}
            {t("loadOlder")}
          </Button>
        </div>
      )}
      {messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("noMessagesYet")}</p>
      ) : (
        <ol role="log" aria-label={t("messagesLog")} className="flex flex-col gap-3">
          {groupMessages(messages).map((group) => {
            const own = group.senderId === meId;
            const name = own ? t("you") : nameOf(group.senderId);
            const time = <time dateTime={group.startedAt}>{formatMessageTime(group.startedAt, language)}</time>;
            if (hiddenSenderIds?.includes(group.senderId)) {
              return (
                <li key={group.key} className="flex items-center gap-2 px-1 text-xs text-muted-foreground italic">
                  <EyeOff className="size-3.5" aria-hidden />
                  {t("hiddenBlocked", { count: group.messages.length })}
                </li>
              );
            }
            if (layout === "room") {
              return (
                <li key={group.key} className="flex gap-3 rounded-md px-1 py-0.5 hover:bg-muted/40">
                  <UserAvatar name={own ? nameOf(group.senderId) : name} imageKey={avatarOf?.(group.senderId)} className="mt-0.5 size-9" />
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-baseline gap-2">
                      <span className={cn("text-sm font-semibold", own && "text-primary")}>{name}</span>
                      <span className="text-xs text-muted-foreground">{time}</span>
                    </span>
                    {group.messages.map((message) => (
                      <p key={message.id} className={cn("text-sm break-words whitespace-pre-wrap", message.pending && "opacity-60")}>
                        {message.content}
                      </p>
                    ))}
                  </div>
                </li>
              );
            }
            return (
              <li key={group.key} className={cn("flex flex-col gap-1", own ? "items-end" : "items-start")}>
                <span className="px-1 text-xs text-muted-foreground">
                  {name} <span aria-hidden>·</span> {time}
                </span>
                {group.messages.map((message) => (
                  <p
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                      own ? "bg-primary/15 text-foreground" : "bg-muted text-foreground",
                      message.pending && "opacity-60",
                    )}
                  >
                    {message.content}
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
