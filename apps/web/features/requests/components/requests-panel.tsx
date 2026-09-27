"use client";

import Link from "next/link";
import { Inbox, Search } from "lucide-react";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMatchRequests } from "../api";
import { useRequestsMessages } from "../messages";
import type { MatchRequestItem } from "../types";
import { RequestCard } from "./request-card";

function newestFirst(requests: MatchRequestItem[]) {
  return [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** One list: requests waiting on you, then on them, then resolved ones greyed out. Rendered in the Inbox Requests tab. */
export function RequestsPanel() {
  const { t } = useRequestsMessages();
  const query = useMatchRequests();

  return (
    <QueryState query={query}>
      {(data) => {
        const all = [...data.incoming, ...data.outgoing];
        if (all.length === 0) {
          return (
            <EmptyState
              icon={Inbox}
              image={"/images/empty-inbox.webp"}
              title={t("empty")}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/find-match">
                    <Search /> {t("findMatch")}
                  </Link>
                </Button>
              }
            />
          );
        }
        const pending = (request: MatchRequestItem) => request.status === "PENDING";
        return (
          <div className="flex flex-col gap-6">
            <RequestGroup title={t("groupYourTurn")} requests={newestFirst(data.incoming.filter(pending))} />
            <RequestGroup title={t("groupTheirTurn")} requests={newestFirst(data.outgoing.filter(pending))} />
            <RequestGroup title={t("groupDone")} requests={newestFirst(all.filter((request) => !pending(request)))} muted />
          </div>
        );
      }}
    </QueryState>
  );
}

function RequestGroup({ title, requests, muted = false }: { title: string; requests: MatchRequestItem[]; muted?: boolean }) {
  if (requests.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {title}
        <Badge variant="secondary" className="tabular-nums">
          {requests.length}
        </Badge>
      </h2>
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} muted={muted} />
      ))}
    </section>
  );
}
