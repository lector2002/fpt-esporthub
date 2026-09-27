"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink, Inbox, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useInboxCounts } from "@/features/comms/use-inbox-counts";
import { ChatView } from "@/features/chat/components/chat-view";
import { ConversationList } from "@/features/chat/components/conversation-list";
import { CountBadge } from "@/features/chat/components/count-badge";
import { useChatMessages } from "@/features/chat/messages";
import { useShellMessages } from "@/features/shell/messages";
import { cn } from "@/lib/utils";

const LATEST_CONVERSATIONS = 5;

/** Quick inbox: pending requests, the latest chats (open one in place), and a way into the full inbox. */
export function InboxButton() {
  const { t } = useShellMessages();
  const { t: tChat } = useChatMessages();
  const active = usePathname().startsWith("/inbox");
  const counts = useInboxCounts().data;
  const pending = counts?.pendingRequests ?? 0;
  const total = pending + (counts?.unreadMessages ?? 0);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setActiveId(null);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative size-9", active && "bg-accent text-primary")}
          aria-label={total > 0 ? `${t("inbox")}, ${t("inboxCount", { count: total })}` : t("inbox")}
        >
          <Inbox className="size-5" />
          {total > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums"
            >
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="flex h-[min(30rem,70dvh)] w-[min(22rem,calc(100vw-2rem))] flex-col gap-0 p-0">
        {activeId ? (
          <ChatView key={activeId} conversationId={activeId} onBack={() => setActiveId(null)} compact />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <h2 className="text-sm font-semibold">{t("inbox")}</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/inbox" onClick={() => onOpenChange(false)}>
                  {tChat("openInbox")} <ExternalLink />
                </Link>
              </Button>
            </div>
            {pending > 0 && (
              <Link
                href="/inbox?tab=requests"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2 border-b border-border px-3 py-2.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
              >
                <UserPlus className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1">{tChat("tabRequests")}</span>
                <CountBadge count={pending} label={t("inboxCount", { count: pending })} />
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <ConversationList limit={LATEST_CONVERSATIONS} onSelect={setActiveId} />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
