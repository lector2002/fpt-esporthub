"use client";

import { useState } from "react";
import { Medal } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { QueryState } from "@/components/common/query-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TournamentStatusBadge } from "@/features/offline-tournaments/components/status-badge";
import { formatVnd } from "@/features/offline-tournaments/format";
import { useOfflineMessages } from "@/features/offline-tournaments/messages";
import type { OfflineTournament, TournamentStatus } from "@/features/offline-tournaments/types";
import { useAdminCups } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import { STACK_ON_PHONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import { LINKED_ROW, RowLink } from "./linked-row";
import { Pagination } from "./pagination";
import { SearchBar } from "./search-bar";

const ALL = "all";
const STATUSES: TournamentStatus[] = ["REGISTRATION", "CHECK_IN", "LIVE", "COMPLETED", "CANCELLED"];

export function CupsTab() {
  const { t } = useAdminDetailMessages();
  const admin = useAdminMessages().t;
  const offline = useOfflineMessages().t;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TournamentStatus | undefined>();
  const [page, setPage] = useState(1);
  const cups = useAdminCups({ q, status, page });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchBar
          placeholder={t("searchCups")}
          onSearch={(value) => {
            setQ(value);
            setPage(1);
          }}
        />
        <Select
          value={status ?? ALL}
          onValueChange={(value) => {
            setStatus(value === ALL ? undefined : (value as TournamentStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label={admin("colStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{admin("allStatuses")}</SelectItem>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {offline(`status_${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <QueryState query={cups} isEmpty={(data) => data.items.length === 0} empty={{ icon: Medal, title: t("noCupsYet") }}>
        {(data) => (
          <>
            <Table className={STACK_ON_PHONE}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCup")}</TableHead>
                  <TableHead>{t("colVenue")}</TableHead>
                  <TableHead>{t("colStarts")}</TableHead>
                  <TableHead>{t("colTeams")}</TableHead>
                  <TableHead>{t("colFee")}</TableHead>
                  <TableHead>{admin("colStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((cup) => (
                  <CupRow key={cup.id} cup={cup} />
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

function CupRow({ cup }: { cup: OfflineTournament }) {
  const { t, language } = useAdminDetailMessages();
  return (
    <TableRow className={LINKED_ROW}>
      <TableCell>
        <div className="flex items-center gap-2">
          <GameBadge game={cup.game} />
          <p className="min-w-0 truncate font-medium">
            <RowLink href={`/admin/cups/${cup.id}`} label={t("openCup", { name: cup.title })}>
              {cup.title}
            </RowLink>
          </p>
        </div>
      </TableCell>
      <TableCell>
        {cup.venue.name}
        <span className="block text-xs text-muted-foreground">{cup.venue.city}</span>
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">{formatDate(cup.startsAt, language, true)}</TableCell>
      <TableCell className="tabular-nums">
        {cup.entryCount}/{cup.maxTeams}
      </TableCell>
      <TableCell className="tabular-nums">{cup.entryFee === 0 ? t("free") : formatVnd(cup.entryFee, language)}</TableCell>
      <TableCell>
        <TournamentStatusBadge status={cup.status} />
      </TableCell>
    </TableRow>
  );
}
