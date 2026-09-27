"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { GameBadge } from "@/components/common/badges";
import { QueryState } from "@/components/common/query-state";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminTeams, useUpdateRecruitment } from "../api";
import { STACK_ON_PHONE, formatDate } from "../format";
import { useAdminMessages } from "../messages";
import type { AdminTeam } from "../types";
import { Pagination } from "./pagination";
import { SearchBar } from "./search-bar";

export function TeamsTab() {
  const { t } = useAdminMessages();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const teams = useAdminTeams({ q, page });

  return (
    <div className="flex flex-col gap-4">
      <SearchBar
        placeholder={t("searchTeams")}
        onSearch={(value) => {
          setQ(value);
          setPage(1);
        }}
      />
      <QueryState
        query={teams}
        isEmpty={(data) => data.items.length === 0}
        empty={{ icon: Shield, title: t("noTeams") }}
      >
        {(data) => (
          <>
            <Table className={STACK_ON_PHONE}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colTeam")}</TableHead>
                  <TableHead>{t("colCaptain")}</TableHead>
                  <TableHead>{t("colMembers")}</TableHead>
                  <TableHead>{t("colCreated")}</TableHead>
                  <TableHead>{t("colRecruitment")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((team) => (
                  <TeamRow key={team.id} team={team} />
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

function TeamRow({ team }: { team: AdminTeam }) {
  const { t, language } = useAdminMessages();
  const update = useUpdateRecruitment();

  const onToggle = (recruitmentOpen: boolean) =>
    update.mutate(
      { teamId: team.id, recruitmentOpen },
      {
        onSuccess: () => toast.success(t(recruitmentOpen ? "recruitmentOn" : "recruitmentOff")),
        onError: (error) => toast.error(t("updateFailed"), { description: error.message }),
      },
    );

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <GameBadge game={team.game} />
          <div className="min-w-0">
            <p className="font-medium">{team.name}</p>
            <p className="text-xs text-muted-foreground">
              {team.rankMin} - {team.rankMax}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>{team.captain.displayName}</TableCell>
      <TableCell className="tabular-nums">{team.memberCount}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(team.createdAt, language)}</TableCell>
      <TableCell>
        <Switch
          checked={team.recruitmentOpen}
          disabled={update.isPending}
          onCheckedChange={onToggle}
          aria-label={t("toggleRecruitment", { name: team.name })}
        />
      </TableCell>
    </TableRow>
  );
}
