"use client";

import Link from "next/link";
import { ArrowLeft, Coins, Flag, Receipt, Star, UserX, Wallet } from "lucide-react";
import { GameBadge, ReputationBadge, VerificationBadge } from "@/components/common/badges";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreditsMessages } from "@/features/credits/messages";
import { formatVnd } from "@/features/offline-tournaments/format";
import { ApiError } from "@/lib/api-client";
import { formatRank } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { useAdminUser } from "../api";
import { STACK_ON_PHONE, formatDate, formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import type { AdminUserDetail, TopUpStatus } from "../types";
import { KpiCard } from "./finance-cards";
import { UserStatusSelect } from "./users-tab";

const TOP_UP_TONE: Record<TopUpStatus, string> = {
  PAID: "border-success/40 text-success",
  PENDING: "border-warning/40 text-warning",
  CANCELLED: "text-muted-foreground",
};

export function UserDetail({ id }: { id: string }) {
  const { t } = useAdminMessages();
  const detail = useAdminUser(id);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/admin/users">
          <ArrowLeft /> {t("backToUsers")}
        </Link>
      </Button>
      {detail.error instanceof ApiError && detail.error.status === 404 ? (
        <EmptyState icon={UserX} title={t("userNotFound")} />
      ) : (
        <QueryState
          query={detail}
          skeleton={
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-64" />
            </div>
          }
        >
          {(data) => <UserDetailBody data={data} />}
        </QueryState>
      )}
    </div>
  );
}

function UserDetailBody({ data }: { data: AdminUserDetail }) {
  const { t, language } = useAdminMessages();
  const { user, money } = data;
  const number = (value: number) => formatNumber(value, language);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={user.displayName} imageKey={user.avatarKey} className="size-16 text-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="truncate">{user.displayName}</span>
            {user.role === "ADMIN" && <Badge variant="secondary">{t("adminRole")}</Badge>}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            {t("joined", { date: formatDate(user.createdAt, language) })}
            {user.premiumUntil && new Date(user.premiumUntil) > new Date() && ` · ${t("premiumUntil", { date: formatDate(user.premiumUntil, language) })}`}
          </p>
        </div>
        <UserStatusSelect user={user} />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={Wallet} label={t("detailBalance")} value={t("credits", { count: number(user.creditBalance) })} tone="text-primary" hints={[`≈ ${formatVnd(user.creditBalance * money.creditVnd, language)}`]} />
        <KpiCard icon={Receipt} label={t("detailPaid")} value={formatVnd(money.paidVnd, language)} hints={[t("detailPaidOrders", { count: number(money.paidOrders) })]} />
        <KpiCard icon={Coins} label={t("detailSpent")} value={t("credits", { count: number(money.creditsSpent) })} hints={[]} />
        <KpiCard
          icon={Star}
          label={t("detailReputation")}
          value={t("points", { count: number(user.reputationPoints) })}
          hints={[t("reportsSummary", { received: user.reportsReceived, open: user.openReportsReceived })]}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ProfilesCard user={user} />
        <TeamsCard user={user} />
      </div>

      <TransactionsCard money={money} />
      <TopUpsCard money={money} />
    </>
  );
}

function ProfilesCard({ user }: { user: AdminUserDetail["user"] }) {
  const { t } = useAdminMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detailProfiles")}</CardTitle>
        <CardAction>
          <ReputationBadge badge={user.reputationBadge} showNew />
        </CardAction>
      </CardHeader>
      <CardContent>
        {user.profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProfiles")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.profiles.map((profile) => (
              <li key={profile.game} className="flex flex-wrap items-center gap-2">
                <GameBadge game={profile.game} />
                <span className="font-medium">{formatRank(profile)}</span>
                <span className="text-muted-foreground">{profile.role}</span>
                <VerificationBadge status={profile.verificationStatus} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TeamsCard({ user }: { user: AdminUserDetail["user"] }) {
  const { t } = useAdminMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detailTeams")}</CardTitle>
        <CardAction className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Flag className="size-3.5" aria-hidden />
          {t("detailReports")}: {user.reportsReceived}
        </CardAction>
      </CardHeader>
      <CardContent>
        {user.teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("userNoTeams")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.teams.map((team) => (
              <li key={team.id} className="flex items-center gap-2">
                <UserAvatar name={team.name} imageKey={team.logoKey} kind="team" className="size-7" />
                <Link href={`/teams/${team.id}`} className="min-w-0 truncate font-medium hover:underline">
                  {team.name}
                </Link>
                <GameBadge game={team.game} />
                {team.role === "captain" && <Badge variant="outline">{t("captain")}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionsCard({ money }: { money: AdminUserDetail["money"] }) {
  const { t, language } = useAdminMessages();
  const credits = useCreditsMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detailTransactions")}</CardTitle>
        {money.transactions.length >= money.historyLimit && (
          <CardAction className="text-xs text-muted-foreground">{t("historyLimit", { count: money.historyLimit })}</CardAction>
        )}
      </CardHeader>
      <CardContent>
        {money.transactions.length === 0 ? (
          <EmptyState icon={Coins} title={t("noTransactions")} />
        ) : (
          <Table className={STACK_ON_PHONE}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colWhen")}</TableHead>
                <TableHead>{t("colKind")}</TableHead>
                <TableHead>{t("colNote")}</TableHead>
                <TableHead className="text-right">{t("colChange")}</TableHead>
                <TableHead className="text-right">{t("colBalanceAfter")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {money.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{formatDate(tx.createdAt, language, true)}</TableCell>
                  <TableCell>{credits.t(`kind_${tx.kind}`)}</TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground">{tx.note}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", tx.amount > 0 ? "text-success" : "text-foreground")}>
                    {tx.amount > 0 ? "+" : ""}
                    {formatNumber(tx.amount, language)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{formatNumber(tx.balanceAfter, language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TopUpsCard({ money }: { money: AdminUserDetail["money"] }) {
  const { t, language } = useAdminMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detailTopUps")}</CardTitle>
      </CardHeader>
      <CardContent>
        {money.topUps.length === 0 ? (
          <EmptyState icon={Receipt} title={t("noTopUps")} />
        ) : (
          <Table className={STACK_ON_PHONE}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colWhen")}</TableHead>
                <TableHead>{t("colOrder")}</TableHead>
                <TableHead className="text-right">{t("colAmount")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {money.topUps.map((topUp) => (
                <TableRow key={topUp.orderCode}>
                  <TableCell className="text-muted-foreground tabular-nums">{formatDate(topUp.paidAt ?? topUp.createdAt, language, true)}</TableCell>
                  <TableCell className="tabular-nums">#{topUp.orderCode}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="font-medium">{formatVnd(topUp.amountVnd, language)}</span>
                    <span className="block text-xs text-muted-foreground">{t("credits", { count: formatNumber(topUp.credits, language) })}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TOP_UP_TONE[topUp.status]}>
                      {t(`topUp_${topUp.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
