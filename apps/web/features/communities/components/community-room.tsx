"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, Compass, Crown, Hash, LogOut, Plus, Settings, Users, Volume2 } from "lucide-react";
import { EmptyState, ErrorState, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { flattenMessages, useConversationMessages, useMarkRead } from "@/features/chat/api";
import { Composer } from "@/features/chat/components/composer";
import { MessageList } from "@/features/chat/components/message-list";
import { useChatMessages } from "@/features/chat/messages";
import { useConversationRoom } from "@/features/chat/socket";
import { CoverEditor, PictureEditor } from "@/features/media/components/picture-editor";
import { useBlockedUsers } from "@/features/safety/api";
import { syncCalls } from "@/features/voice/call-controller";
import { useVoiceState } from "@/features/voice/store";
import { ApiError } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { communityHref, useCommunity, useMyCommunities } from "../api";
import { useCommunityMessages } from "../messages";
import type { CommunityChannel, CommunityDetail } from "../types";
import { CommunityGameBadge, CommunityIcon, communityArt, InVoiceBadge, JoinCommunityButton } from "./community-card";
import { CommunitySettingsDialog } from "./community-form";
import { AddChannelDialog, DeleteChannelButton, LeaveDialog, MembersCard, VoiceRoomsCard } from "./community-panels";

/** Chat card height: fills the screen under the header on desktop, a fixed block on phones. */
const CHAT_HEIGHT = "h-[32rem] lg:h-[calc(100dvh-9rem)] lg:max-h-[48rem] lg:min-h-[30rem]";

/** `/communities/[id]`: cover header like the team page, the chat with channel tabs, voice rooms and members on the side. */
export function CommunityRoomView({ id, channel }: { id: string; channel?: string }) {
  const { t } = useCommunityMessages();
  const query = useCommunity(id);
  if (query.error instanceof ApiError && query.error.status === 404) {
    return <EmptyState icon={Compass} title={t("notFoundTitle")} description={t("notFoundHint")} />;
  }
  return (
    <QueryState query={query} skeleton={<Skeleton className="h-[32rem] w-full rounded-xl" />}>
      {(community) => <CommunityPage community={community} initialChannel={channel} />}
    </QueryState>
  );
}

function CommunityPage({ community, initialChannel }: { community: CommunityDetail; initialChannel?: string }) {
  const [selected, setSelected] = useState(initialChannel);
  const texts = community.channels.filter((channel) => channel.kind === "text");
  const current = texts.find((channel) => channel.id === selected) ?? texts[0];

  // Catch up on who is in voice (and start hearing about it) after joining.
  useEffect(() => {
    void syncCalls();
  }, [community.id, community.viewerRole]);

  const select = (channelId: string) => {
    setSelected(channelId);
    // Shareable, refresh-safe URL without a server round trip.
    window.history.replaceState(null, "", communityHref(community.id, channelId));
  };

  return (
    <div className="flex flex-col gap-6" data-testid="community-page">
      <CommunityHeader community={community} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ChatCard community={community} channels={texts} current={current} onSelect={select} />
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <VoiceRoomsCard community={community} />
          <MembersCard community={community} />
        </aside>
      </div>
    </div>
  );
}

function CommunityHeader({ community }: { community: CommunityDetail }) {
  const { t } = useCommunityMessages();
  const rooms = useVoiceState().rooms;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const isOwner = community.viewerRole === "owner";
  const pictures = `/media/communities/${encodeURIComponent(community.id)}`;
  const paths = (picture: "icon" | "cover") => (isOwner ? { upload: `${pictures}/${picture}`, remove: `${pictures}/${picture}` } : {});
  // Live count from the socket, falling back to the last poll.
  const live = community.channels.reduce((sum, channel) => sum + (rooms[channel.id]?.participants.length ?? 0), 0);

  return (
    <header className="flex flex-col gap-4">
      <CoverEditor
        imageKey={community.coverKey}
        fallback={communityArt({ coverKey: null, game: community.game })}
        paths={paths("cover")}
        fade="from-background"
        className="-mb-14 h-32 rounded-xl sm:h-44"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4 px-1 sm:px-4">
        <div className="flex min-w-0 items-center gap-4">
          <PictureEditor name={community.name} imageKey={community.iconKey} kind="team" paths={paths("icon")} className="size-16 text-xl ring-4 ring-background" />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{community.name}</h1>
              <CommunityGameBadge game={community.game} />
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Users className="size-4" aria-hidden />
                {t("memberCount", { count: community.memberCount })}
              </li>
              <li className="flex items-center gap-1.5">
                <Crown className="size-4" aria-hidden />
                {community.owner.displayName}
              </li>
              {(live || community.inVoice) > 0 && (
                <li>
                  <InVoiceBadge count={live || community.inVoice} />
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="on-picture flex flex-wrap gap-2">
          <CommunitySwitcher current={community} />
          {isOwner && (
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings /> {t("settings")}
            </Button>
          )}
          {community.viewerRole === "member" && (
            <Button variant="outline" onClick={() => setLeaveOpen(true)}>
              <LogOut /> {t("leave")}
            </Button>
          )}
          {!community.viewerRole && <JoinCommunityButton community={community} className="h-8 px-3" />}
        </div>
      </div>
      {community.description && <p className="max-w-3xl px-1 text-sm text-muted-foreground sm:px-4">{community.description}</p>}
      {settingsOpen && <CommunitySettingsDialog community={community} open onOpenChange={setSettingsOpen} />}
      <LeaveDialog community={community} open={leaveOpen} onOpenChange={setLeaveOpen} />
    </header>
  );
}

/** Jump between the communities you joined, or back to discover. */
function CommunitySwitcher({ current }: { current: CommunityDetail }) {
  const { t } = useCommunityMessages();
  const mine = useMyCommunities().data ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <ChevronsUpDown /> {t("switchCommunity")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {mine.length > 0 && <DropdownMenuLabel>{t("yourCommunities")}</DropdownMenuLabel>}
        {mine.map((item) => (
          <DropdownMenuItem key={item.id} asChild disabled={item.id === current.id}>
            <Link href={communityHref(item.id)}>
              <CommunityIcon community={item} className="size-6 text-[0.625rem]" />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.inVoice > 0 && <Volume2 className="text-success" aria-label={t("inVoiceCount", { count: item.inVoice })} />}
            </Link>
          </DropdownMenuItem>
        ))}
        {mine.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem asChild>
          <Link href="/communities">
            <Compass /> {t("discover")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ChatCardProps {
  community: CommunityDetail;
  channels: CommunityChannel[];
  current: CommunityChannel | undefined;
  onSelect: (channelId: string) => void;
}

function ChatCard({ community, channels, current, onSelect }: ChatCardProps) {
  const { t } = useCommunityMessages();
  const [adding, setAdding] = useState(false);
  const isOwner = community.viewerRole === "owner";

  return (
    <Card className={cn("gap-0 py-0", CHAT_HEIGHT)} aria-label={current ? `#${current.name}` : undefined} role="region">
      <div className="flex shrink-0 items-center gap-1 border-b border-border p-2">
        <nav aria-label={t("textChannels")} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelect(channel.id)}
              aria-current={channel.id === current?.id ? "page" : undefined}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                channel.id === current?.id && "bg-primary/15 font-medium text-primary hover:bg-primary/20 hover:text-primary",
              )}
            >
              <Hash className="size-3.5" aria-hidden />
              {channel.name}
            </button>
          ))}
          {isOwner && (
            <Button variant="ghost" size="icon-sm" aria-label={t("addTextChannel")} onClick={() => setAdding(true)} className="shrink-0 text-muted-foreground">
              <Plus />
            </Button>
          )}
        </nav>
        {isOwner && current && channels.length > 1 && <DeleteChannelButton community={community} channel={current} />}
      </div>
      {current?.conversationId ? (
        <ChannelMessages key={current.id} community={community} channel={current} conversationId={current.conversationId} />
      ) : (
        <CommunityPreview community={community} />
      )}
      {adding && <AddChannelDialog community={community} kind="text" onClose={() => setAdding(false)} />}
    </Card>
  );
}

/** Non-members see who is here and a join button instead of the chat. */
function CommunityPreview({ community }: { community: CommunityDetail }) {
  const { t } = useCommunityMessages();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
      <CommunityIcon community={community} className="size-16 text-xl" />
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-semibold">{t("previewTitle", { community: community.name })}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t("previewHint")}</p>
      </div>
      <JoinCommunityButton community={community} className="h-10 px-5" />
    </div>
  );
}

function ChannelMessages({ community, channel, conversationId }: { community: CommunityDetail; channel: CommunityChannel; conversationId: string }) {
  const { t } = useCommunityMessages();
  const chat = useChatMessages().t;
  const { user } = useSession();
  const query = useConversationMessages(conversationId);
  const { mutate: markRead } = useMarkRead(conversationId);
  const blocks = useBlockedUsers();
  useConversationRoom(conversationId);

  const messages = flattenMessages(query.data);
  const lastIncomingId = [...messages].reverse().find((m) => m.senderId !== user?.id && !m.pending)?.id;
  const loaded = query.isSuccess;

  useEffect(() => {
    if (loaded) markRead();
  }, [conversationId, loaded, lastIncomingId, markRead]);

  const memberOf = (senderId: string) => community.members.find((member) => member.userId === senderId);

  if (query.isError) {
    return (
      <div className="p-4">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  if (query.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-12 w-3/5" />
      </div>
    );
  }
  return (
    <>
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col justify-end p-4">
          <EmptyState icon={Hash} title={t("welcomeTitle", { channel: channel.name })} description={t("welcomeHint", { channel: channel.name, community: community.name })} />
        </div>
      ) : (
        <MessageList
          layout="room"
          messages={messages}
          meId={user?.id}
          nameOf={(senderId) => memberOf(senderId)?.displayName ?? chat("unknownUser")}
          avatarOf={(senderId) => memberOf(senderId)?.avatarKey}
          hiddenSenderIds={blocks.data?.map((block) => block.userId)}
          hasOlder={query.hasNextPage}
          loadingOlder={query.isFetchingNextPage}
          onLoadOlder={() => void query.fetchNextPage()}
        />
      )}
      <Composer conversationId={conversationId} placeholder={t("messagePlaceholder", { channel: channel.name })} />
    </>
  );
}
