"use client";

import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryState, ListSkeleton } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useConversations } from "../api";
import { formatRelative } from "../format";
import { useChatMessages } from "../messages";
import { CountBadge } from "./count-badge";
import type { ConversationSummary } from "../types";

interface ConversationListProps {
  selectedId?: string | null;
  /** Show only the N most recent conversations. */
  limit?: number;
  /** Link mode: each item navigates to this URL. */
  hrefFor?: (id: string) => string;
  /** Button mode: each item calls this instead of navigating. */
  onSelect?: (id: string) => void;
}

export function ConversationList({ selectedId, limit, hrefFor, onSelect }: ConversationListProps) {
  const { t } = useChatMessages();
  const query = useConversations();
  return (
    <QueryState
      query={query}
      skeleton={<ListSkeleton rows={4} />}
      isEmpty={(items) => items.length === 0}
      empty={{
        icon: MessagesSquare,
        image: "/images/empty-inbox.webp",
        title: t("emptyConversationsTitle"),
        description: t("emptyConversationsDescription"),
        action: (
          <Button asChild size="sm">
            <Link href="/find-match">{t("findMatch")}</Link>
          </Button>
        ),
      }}
    >
      {(items) => (
        <ul className="flex flex-col gap-1">
          {items.slice(0, limit).map((item) => (
            <li key={item.id}>
              <ConversationListItem item={item} selected={item.id === selectedId} href={hrefFor?.(item.id)} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
}

function ConversationListItem({
  item,
  selected,
  href,
  onSelect,
}: {
  item: ConversationSummary;
  selected: boolean;
  href?: string;
  onSelect?: (id: string) => void;
}) {
  const { t, language } = useChatMessages();
  const { user } = useSession();
  const name = item.team?.name ?? item.otherParticipant?.displayName ?? t("unknownUser");
  const last = item.lastMessage;
  const preview = last ? `${last.senderId === user?.id ? `${t("you")}: ` : ""}${last.content}` : t("noMessagesYet");
  const unread = item.unreadCount > 0;
  const className = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    selected && "bg-muted",
  );
  const content = (
    <>
      <UserAvatar name={name} imageKey={item.team ? item.team.logoKey : item.otherParticipant?.avatarKey} kind={item.team ? "team" : "player"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{name}</span>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={last?.createdAt ?? item.updatedAt}>
            {formatRelative(last?.createdAt ?? item.updatedAt, language)}
          </time>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-xs", unread ? "text-foreground" : "text-muted-foreground")}>{preview}</span>
          <CountBadge count={item.unreadCount} label={t("unreadCount", { count: item.unreadCount })} />
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-current={selected ? "true" : undefined} scroll={false}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => onSelect?.(item.id)}>
      {content}
    </button>
  );
}
