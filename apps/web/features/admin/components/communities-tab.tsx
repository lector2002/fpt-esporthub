"use client";

import { useState } from "react";
import { Hash, MessagesSquare, Users } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { QueryState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminCommunities } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import type { AdminCommunityRow } from "../detail-types";
import { STACK_ON_PHONE, formatDate, formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import { LINKED_ROW, RowLink } from "./linked-row";
import { Pagination } from "./pagination";
import { SearchBar } from "./search-bar";

export function CommunitiesTab() {
  const { t } = useAdminDetailMessages();
  const admin = useAdminMessages().t;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const communities = useAdminCommunities({ q, page });

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        placeholder={t("searchCommunities")}
        onSearch={(value) => {
          setQ(value);
          setPage(1);
        }}
      />
      <QueryState query={communities} isEmpty={(data) => data.items.length === 0} empty={{ icon: MessagesSquare, title: t("noCommunities") }}>
        {(data) => (
          <>
            <Table className={STACK_ON_PHONE}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCommunity")}</TableHead>
                  <TableHead>{t("colOwner")}</TableHead>
                  <TableHead>{t("colMembers")}</TableHead>
                  <TableHead>{t("colChannels")}</TableHead>
                  <TableHead>{admin("colCreated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((community) => (
                  <CommunityRow key={community.id} community={community} />
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </QueryState>
    </div>
  );
}

function CommunityRow({ community }: { community: AdminCommunityRow }) {
  const { t, language } = useAdminDetailMessages();
  return (
    <TableRow className={LINKED_ROW}>
      <TableCell>
        <div className="flex items-center gap-2">
          <UserAvatar name={community.name} imageKey={community.iconKey} kind="team" className="size-8" />
          <p className="min-w-0 truncate font-medium">
            <RowLink href={`/admin/communities/${community.id}`} label={t("openCommunity", { name: community.name })}>
              {community.name}
            </RowLink>
          </p>
          {community.game ? <GameBadge game={community.game} /> : <Badge variant="outline">{t("anyGame")}</Badge>}
        </div>
      </TableCell>
      <TableCell>{community.owner.displayName}</TableCell>
      <TableCell className="tabular-nums">
        <span className="inline-flex items-center gap-1" title={t("colMembers")}>
          <Users className="size-3.5 text-muted-foreground" aria-hidden />
          {formatNumber(community.memberCount, language)}
        </span>
      </TableCell>
      <TableCell className="tabular-nums">
        <span className="inline-flex items-center gap-1" title={t("colChannels")}>
          <Hash className="size-3.5 text-muted-foreground" aria-hidden />
          {formatNumber(community.channelCount, language)}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">{formatDate(community.createdAt, language)}</TableCell>
    </TableRow>
  );
}
