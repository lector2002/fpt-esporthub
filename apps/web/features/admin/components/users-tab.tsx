"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { ReputationBadge, GameBadge, VerificationBadge } from "@/components/common/badges";
import { QueryState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRank } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useAdminUsers } from "../api";
import { STACK_ON_PHONE, USER_STATUS_TONE } from "../format";
import { useAdminMessages } from "../messages";
import { USER_STATUSES, type AdminUser, type UserStatus } from "../types";
import { Pagination } from "./pagination";
import { SearchBar } from "./search-bar";
import { UserStatusDialog } from "./user-status-dialog";

const ALL = "all";

export function UsersTab() {
  const { t } = useAdminMessages();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<UserStatus | undefined>();
  const [page, setPage] = useState(1);
  const users = useAdminUsers({ q, status, page });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchBar
          placeholder={t("searchUsers")}
          onSearch={(value) => {
            setQ(value);
            setPage(1);
          }}
        />
        <Select
          value={status ?? ALL}
          onValueChange={(value) => {
            setStatus(value === ALL ? undefined : (value as UserStatus));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label={t("colStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {USER_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`status_${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <QueryState
        query={users}
        isEmpty={(data) => data.items.length === 0}
        empty={{ icon: Users, title: t("noUsers") }}
      >
        {(data) => (
          <>
            <UsersTable users={data.items} />
            <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </QueryState>
    </div>
  );
}

function UsersTable({ users }: { users: AdminUser[] }) {
  const { t } = useAdminMessages();
  return (
    <Table className={STACK_ON_PHONE}>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colUser")}</TableHead>
          <TableHead>{t("colGames")}</TableHead>
          <TableHead>{t("colReputation")}</TableHead>
          <TableHead>{t("colReports")}</TableHead>
          <TableHead>{t("colStatus")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </TableBody>
    </Table>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const { t } = useAdminMessages();
  const session = useSession();
  const [pendingStatus, setPendingStatus] = useState<UserStatus | null>(null);
  const locked = user.role === "ADMIN" || user.id === session.user?.id;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <UserAvatar name={user.displayName} imageKey={user.avatarKey} className="size-8" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium">
              {user.displayName}
              {user.role === "ADMIN" && <Badge variant="secondary">{t("adminRole")}</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {user.profiles.length === 0 ? (
          <span className="text-muted-foreground">{t("noProfiles")}</span>
        ) : (
          <div className="flex flex-col gap-1">
            {user.profiles.map((profile) => (
              <div key={profile.game} className="flex items-center gap-1.5">
                <GameBadge game={profile.game} />
                <span>{formatRank(profile)}</span>
                <VerificationBadge status={profile.verificationStatus} />
              </div>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <ReputationBadge badge={user.reputationBadge} showNew />
          <span className="text-xs text-muted-foreground">{t("points", { count: user.reputationPoints })}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {t("reportsSummary", { received: user.reportsReceived, open: user.openReportsReceived })}
      </TableCell>
      <TableCell>
        <Select value={user.status} disabled={locked} onValueChange={(value) => setPendingStatus(value as UserStatus)}>
          <SelectTrigger size="sm" className={cn("w-32", USER_STATUS_TONE[user.status])} aria-label={t("colStatus")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`status_${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <UserStatusDialog user={user} nextStatus={pendingStatus} onClose={() => setPendingStatus(null)} />
      </TableCell>
    </TableRow>
  );
}
