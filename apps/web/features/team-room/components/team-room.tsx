"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Hash, Lock, Settings, Users, Volume2 } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, QueryState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { flattenMessages, useConversationMessages, useMarkRead } from "@/features/chat/api";
import { Composer } from "@/features/chat/components/composer";
import { MessageList } from "@/features/chat/components/message-list";
import { useChatMessages } from "@/features/chat/messages";
import { useConversationRoom } from "@/features/chat/socket";
import { useBlockedUsers } from "@/features/safety/api";
import { useMyTeams, useTeam } from "@/features/teams/api";
import type { TeamDetail } from "@/features/teams/types";
import { syncCalls } from "@/features/voice/call-controller";
import { roomHref } from "@/features/voice/components/call-bar";
import { useVoiceState } from "@/features/voice/store";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useTeamRoomMessages } from "../messages";
import { MemberList } from "./member-list";
import { VoiceChannel, VoicePanel } from "./voice-channel";

/** `/teams/[id]/room`: Discord-style team space. One text channel (the team conversation) and one voice channel. */
export function TeamRoomView({ id }: { id: string }) {
  const { t } = useTeamRoomMessages();
  const query = useTeam(id);

  return (
    <div className="flex flex-col gap-3">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href={`/teams/${id}`}>
          <ArrowLeft /> {t("backToTeam")}
        </Link>
      </Button>
      <QueryState query={query} skeleton={<Skeleton className="h-[calc(100dvh-13rem)] min-h-[28rem] w-full" />}>
        {(team) =>
          team.conversationId ? (
            <RoomLayout team={team} conversationId={team.conversationId} />
          ) : (
            <EmptyState icon={Lock} title={t("notMemberTitle")} description={t("notMemberHint")} />
          )
        }
      </QueryState>
    </div>
  );
}

function RoomLayout({ team, conversationId }: { team: TeamDetail; conversationId: string }) {
  const { t } = useTeamRoomMessages();
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  // Catch up on who is in voice (and start hearing about it) even if the socket connected before joining the team.
  useEffect(() => {
    void syncCalls();
  }, [team.id]);

  return (
    <div className="grid h-[calc(100dvh-13rem)] min-h-[28rem] overflow-hidden rounded-xl border border-border bg-card md:h-[calc(100dvh-9.5rem)] lg:grid-cols-[4.5rem_15rem_minmax(0,1fr)_15rem]">
      <aside className="hidden min-h-0 overflow-y-auto border-r border-border bg-muted/30 lg:block">
        <TeamRail team={team} />
      </aside>
      <aside className="hidden min-h-0 flex-col border-r border-border bg-muted/15 lg:flex">
        <ChannelSidebar team={team} />
      </aside>
      <RoomChat team={team} conversationId={conversationId} onOpenChannels={() => setChannelsOpen(true)} onOpenMembers={() => setMembersOpen(true)} />
      <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-muted/15 lg:block">
        <MemberList team={team} />
      </aside>

      <Sheet open={channelsOpen} onOpenChange={setChannelsOpen}>
        {/* The channel header already holds a button where the close button would sit; the overlay closes it. */}
        <SheetContent side="left" showCloseButton={false} className="w-[19.5rem] flex-row gap-0 p-0">
          <SheetTitle className="sr-only">{t("textChannels")}</SheetTitle>
          <div className="w-[4.5rem] shrink-0 overflow-y-auto border-r border-border bg-muted/30">
            <TeamRail team={team} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <ChannelSidebar team={team} />
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side="right" className="w-72 gap-0 overflow-y-auto p-0 pt-10">
          <SheetTitle className="sr-only">{t("members")}</SheetTitle>
          <MemberList team={team} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Far left, like Discord's server list: the viewer's teams in this game. */
function TeamRail({ team }: { team: TeamDetail }) {
  const { t } = useTeamRoomMessages();
  const teams = useMyTeams(team.game).data ?? [];
  const rooms = useVoiceState().rooms;

  return (
    <nav aria-label={t("yourTeams")} className="flex flex-col items-center gap-2 py-3">
      <RailItem label={t("allTeams")} href="/teams">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Users className="size-5" />
        </span>
      </RailItem>
      <Separator className="w-8!" />
      {teams.map((item) => (
        <RailItem key={item.id} label={item.name} href={roomHref(item.id)} active={item.id === team.id} live={Boolean(rooms[item.id])}>
          <UserAvatar name={item.name} imageKey={item.logoKey} kind="team" className="size-11" />
        </RailItem>
      ))}
    </nav>
  );
}

interface RailItemProps {
  label: string;
  href: string;
  children: React.ReactNode;
  active?: boolean;
  /** Someone is in the team's voice room. */
  live?: boolean;
}

function RailItem({ label, href, children, active, live }: RailItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className="group relative flex w-full justify-center focus-visible:outline-none"
        >
          <span
            className={cn(
              "absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all",
              active ? "h-8" : "h-0 group-hover:h-4",
            )}
            aria-hidden
          />
          <span className="rounded-full ring-primary/60 transition-shadow group-focus-visible:ring-3">{children}</span>
          {live && (
            <span className="absolute right-3 bottom-0 flex size-4 items-center justify-center rounded-full bg-success text-background ring-2 ring-card" aria-hidden>
              <Volume2 className="size-2.5" />
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function ChannelSidebar({ team }: { team: TeamDetail }) {
  const { t } = useTeamRoomMessages();
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="min-w-0 flex-1 truncate font-semibold">{team.name}</h2>
        <GameBadge game={team.game} />
        <Button asChild variant="ghost" size="icon-sm" aria-label={t("teamSettings")}>
          <Link href={`/teams/${team.id}`}>
            <Settings />
          </Link>
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2">
        <ChannelGroup label={t("textChannels")}>
          <div aria-current="page" className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-sm font-medium">
            <Hash className="size-4 text-muted-foreground" aria-hidden />
            {t("general")}
          </div>
        </ChannelGroup>
        <ChannelGroup label={t("voiceChannels")}>
          <VoiceChannel team={team} />
        </ChannelGroup>
      </div>
      <VoicePanel team={team} />
    </>
  );
}

function ChannelGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase">{label}</h3>
      {children}
    </section>
  );
}

interface RoomChatProps {
  team: TeamDetail;
  conversationId: string;
  onOpenChannels: () => void;
  onOpenMembers: () => void;
}

function RoomChat({ team, conversationId, onOpenChannels, onOpenMembers }: RoomChatProps) {
  const { t } = useTeamRoomMessages();
  const chat = useChatMessages().t;
  const { user } = useSession();
  const query = useConversationMessages(conversationId);
  const { mutate: markRead } = useMarkRead(conversationId);
  const blocks = useBlockedUsers();
  useConversationRoom(conversationId);

  const messages = flattenMessages(query.data);
  const lastIncomingId = [...messages].reverse().find((m) => m.senderId !== user?.id && !m.pending)?.id;
  const loaded = query.isSuccess;

  // Read on open and whenever a new message arrives while open.
  useEffect(() => {
    if (loaded) markRead();
  }, [conversationId, loaded, lastIncomingId, markRead]);

  // Former members keep their name through the conversation head.
  const members = query.data?.pages[0]?.conversation.team?.members ?? [];
  const nameOf = (senderId: string) =>
    team.members.find((m) => m.userId === senderId)?.displayName ?? members.find((m) => m.id === senderId)?.displayName ?? chat("unknownUser");
  const avatarOf = (senderId: string) =>
    team.members.find((m) => m.userId === senderId)?.avatarKey ?? members.find((m) => m.id === senderId)?.avatarKey;
  const channel = t("general");

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-label={`#${channel}`}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button variant="outline" size="sm" onClick={onOpenChannels} aria-label={t("openChannels")} className="lg:hidden">
          <Volume2 /> {t("voiceShort")}
        </Button>
        <Hash className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <h2 className="font-semibold">{channel}</h2>
        <Separator orientation="vertical" className="mx-1 hidden h-5! sm:block" />
        <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground sm:block">{t("channelTopic", { team: team.name })}</p>
        <Button variant="ghost" size="sm" onClick={onOpenMembers} aria-label={t("openMembers")} className="ml-auto lg:hidden">
          <Users /> <span className="tabular-nums">{team.memberCount}</span>
        </Button>
      </header>
      {query.isError ? (
        <div className="p-4">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : query.isPending ? (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-12 w-3/5" />
        </div>
      ) : (
        <>
          <MessageList
            layout="room"
            messages={messages}
            meId={user?.id}
            nameOf={nameOf}
            avatarOf={avatarOf}
            hiddenSenderIds={blocks.data?.map((block) => block.userId)}
            hasOlder={query.hasNextPage}
            loadingOlder={query.isFetchingNextPage}
            onLoadOlder={() => void query.fetchNextPage()}
          />
          <Composer conversationId={conversationId} placeholder={t("messagePlaceholder", { channel })} />
        </>
      )}
    </section>
  );
}
