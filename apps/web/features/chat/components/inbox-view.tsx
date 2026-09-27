"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, MessagesSquare, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/query-state";
import { PageHeader } from "@/components/common/page-header";
import { useInboxCounts } from "@/features/comms/use-inbox-counts";
import { RequestsPanel } from "@/features/requests/components/requests-panel";
import { cn } from "@/lib/utils";
import { useChatMessages } from "../messages";
import { ChatView } from "./chat-view";
import { ConversationList } from "./conversation-list";
import { CountBadge } from "./count-badge";

type InboxTab = "messages" | "requests";

const conversationHref = (id: string) => `/inbox?c=${encodeURIComponent(id)}`;

/** `/inbox`: Messages | Requests. `?tab=requests` selects Requests, `?c=<id>` opens a conversation. */
export function InboxView() {
  const { t } = useChatMessages();
  const router = useRouter();
  const params = useSearchParams();
  const counts = useInboxCounts();
  const tab: InboxTab = params.get("tab") === "requests" ? "requests" : "messages";
  const selectedId = params.get("c");

  const onTabChange = (value: string) => {
    router.replace(value === "requests" ? "/inbox?tab=requests" : "/inbox", { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("inboxTitle")} />
      <Tabs value={tab} onValueChange={onTabChange} className="gap-4">
        <TabsList>
          <TabsTrigger value="messages">
            <MessageCircle /> {t("tabMessages")}
            <CountBadge count={counts.data?.unreadMessages ?? 0} />
          </TabsTrigger>
          <TabsTrigger value="requests">
            <UserPlus /> {t("tabRequests")}
            <CountBadge count={counts.data?.pendingRequests ?? 0} />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="messages">
          <MessagesPane selectedId={selectedId} onBack={() => router.push("/inbox", { scroll: false })} />
        </TabsContent>
        <TabsContent value="requests">
          <RequestsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Two panes from `lg:`; on mobile shows the list or the open chat. */
function MessagesPane({ selectedId, onBack }: { selectedId: string | null; onBack: () => void }) {
  const { t } = useChatMessages();
  return (
    <div className="grid h-[calc(100dvh-18.5rem)] min-h-[26rem] md:h-[calc(100dvh-12rem)] overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className={cn("min-h-0 overflow-y-auto p-2 lg:block lg:border-r lg:border-border", selectedId && "hidden")}>
        <ConversationList selectedId={selectedId} hrefFor={conversationHref} />
      </aside>
      <div className={cn("min-h-0 min-w-0", !selectedId && "hidden lg:block")}>
        {selectedId ? (
          <ChatView key={selectedId} conversationId={selectedId} onBack={onBack} backOnlyOnMobile />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState icon={MessagesSquare} title={t("noSelectionTitle")} />
          </div>
        )}
      </div>
    </div>
  );
}
