"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/query-state";
import { ReputationBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { useBlockedUsers } from "@/features/safety/api";
import { SafetyMenu } from "@/features/safety/components/safety-menu";
import { CallButton } from "@/features/voice/components/call-button";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { flattenMessages, useConversationMessages, useMarkRead } from "../api";
import { useChatMessages } from "../messages";
import { useConversationRoom } from "../socket";
import type { ConversationDetail } from "../types";
import { Composer } from "./composer";
import { MessageList } from "./message-list";

interface ChatViewProps {
  conversationId: string;
  /** Shows a back button (mobile inbox, bubble). */
  onBack?: () => void;
  /** Hide the back button from `lg:` up (two-pane inbox). */
  backOnlyOnMobile?: boolean;
  compact?: boolean;
}

export function ChatView({ conversationId, onBack, backOnlyOnMobile, compact }: ChatViewProps) {
  const { t } = useChatMessages();
  const { user } = useSession();
  const query = useConversationMessages(conversationId);
  const { mutate: markRead } = useMarkRead(conversationId);
  const blocks = useBlockedUsers();
  useConversationRoom(conversationId);

  const messages = flattenMessages(query.data);
  const lastIncomingId = [...messages].reverse().find((m) => m.senderId !== user?.id && !m.pending)?.id;
  const loaded = query.isSuccess;

  // Read on open and whenever a new message from the other side arrives while open.
  useEffect(() => {
    if (loaded) markRead();
  }, [conversationId, loaded, lastIncomingId, markRead]);

  const head = query.data?.pages[0]?.conversation;
  const otherId = head?.otherParticipant?.id;
  const blockedByMe = Boolean(otherId && blocks.data?.some((block) => block.userId === otherId));
  const blocked = blockedByMe ? "byMe" : head?.blockedByOther ? "byOther" : null;
  const back = onBack && (
    <Button variant="ghost" size="icon" onClick={onBack} aria-label={t("back")} className={cn(backOnlyOnMobile && "lg:hidden")}>
      <ArrowLeft />
    </Button>
  );

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className={cn("flex items-center gap-2 border-b border-border", compact ? "px-2 py-2" : "px-3 py-3")}>
        {back}
        {head ? <ChatHeader head={head} blocked={Boolean(blocked)} compact={compact} /> : <Skeleton className="h-9 w-48" />}
      </header>
      {query.isError ? (
        <div className="p-4">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : query.isPending ? (
        <div className="flex flex-1 flex-col gap-3 p-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="ml-auto h-10 w-1/2" />
          <Skeleton className="h-10 w-3/5" />
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            meId={user?.id}
            nameOf={(senderId) =>
              head?.team?.members.find((member) => member.id === senderId)?.displayName ??
              head?.otherParticipant?.displayName ??
              t("unknownUser")
            }
            hiddenSenderIds={head?.team ? blocks.data?.map((block) => block.userId) : undefined}
            hasOlder={query.hasNextPage}
            loadingOlder={query.isFetchingNextPage}
            onLoadOlder={() => void query.fetchNextPage()}
          />
          {blocked && (
            <p role="status" className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <Ban className="size-3.5 shrink-0 text-destructive" />
              {t(blocked === "byMe" ? "blockedByMe" : "blockedByOther")}
            </p>
          )}
          <Composer conversationId={conversationId} disabled={Boolean(blocked)} />
        </>
      )}
    </section>
  );
}

function ChatHeader({ head, blocked, compact }: { head: ConversationDetail; blocked: boolean; compact?: boolean }) {
  const { t } = useChatMessages();
  if (head.team) return <TeamChatHeader team={head.team} compact={compact} />;
  const other = head.otherParticipant;
  const name = other?.displayName ?? t("unknownUser");
  const request = head.matchRequest;
  const team = request?.teamName ?? "";
  const context =
    request?.type === "PLAYER_TO_PLAYER"
      ? t("requestPlayerToPlayer")
      : t(request?.type === "PLAYER_TO_TEAM" ? "requestPlayerToTeam" : "requestTeamToPlayer", { team });

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <UserAvatar name={name} imageKey={other?.avatarKey} className={compact ? "size-8" : undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-sm font-semibold">{name}</h2>
          {other && !compact && <ReputationBadge badge={other.reputationBadge} />}
        </div>
        <p className="truncate text-xs text-muted-foreground">{context}</p>
      </div>
      {other && <CallButton conversationId={head.id} blocked={blocked} size={compact ? "icon-sm" : "icon"} />}
      {other && (
        <SafetyMenu
          targetType="user"
          targetId={other.id}
          targetName={other.displayName}
          owner={{ id: other.id, name: other.displayName }}
          size={compact ? "icon-sm" : "icon"}
        />
      )}
    </div>
  );
}

/** Team room chat seen from the inbox: voice and members live on the room page. */
function TeamChatHeader({ team, compact }: { team: NonNullable<ConversationDetail["team"]>; compact?: boolean }) {
  const { t } = useChatMessages();
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <UserAvatar name={team.name} imageKey={team.logoKey} kind="team" className={compact ? "size-8" : undefined} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold">{team.name}</h2>
        <p className="truncate text-xs text-muted-foreground">{t("teamRoom")}</p>
      </div>
      <Button asChild variant="outline" size={compact ? "icon-sm" : "sm"} aria-label={t("openRoom")}>
        <Link href={`/teams/${team.id}/room`}>
          <Users />
          {!compact && t("openRoom")}
        </Link>
      </Button>
    </div>
  );
}
