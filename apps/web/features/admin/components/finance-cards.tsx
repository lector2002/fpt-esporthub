"use client";

import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatVnd } from "@/features/offline-tournaments/format";
import { cn } from "@/lib/utils";
import { useFinanceMessages } from "../finance-messages";
import { STACK_ON_PHONE, formatDate, formatNumber } from "../format";
import type { AdminFinance, SpendKind, TopUpStatus } from "../types";

const SPEND_KINDS: SpendKind[] = ["BOOST", "FEATURE", "COSMETIC", "GUIDE", "COACHING"];
const SPEND_COLOR: Record<SpendKind, string> = {
  BOOST: "bg-chart-1",
  FEATURE: "bg-chart-2",
  COSMETIC: "bg-chart-5",
  GUIDE: "bg-chart-4",
  COACHING: "bg-chart-3",
};
const STATUS_TONE: Record<TopUpStatus, string> = {
  PAID: "border-success/40 text-success",
  PENDING: "border-warning/40 text-warning",
  CANCELLED: "text-muted-foreground",
};

const percent = (value: number, total: number, language: "vi" | "en") =>
  new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", { style: "percent", maximumFractionDigits: 0 }).format(total ? value / total : 0);

export function KpiCard({ icon: Icon, label, value, hints, tone }: { icon: LucideIcon; label: string; value: string; hints: string[]; tone?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4" aria-hidden />
          {label}
        </p>
        <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", tone)}>{value}</p>
        {hints.map((hint) => (
          <p key={hint} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

/** One bar per day; the tallest day fills the chart. Hover or focus a bar for its numbers. */
export function RevenueChart({ data }: { data: AdminFinance }) {
  const { t, language } = useFinanceMessages();
  const max = Math.max(...data.daily.map((day) => day.vnd));
  const peak = data.daily.find((day) => day.vnd === max);
  const dayLabel = (day: string) => formatDate(`${day}T12:00:00`, language);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t("dailyRevenue")}</CardTitle>
        <CardAction className="text-sm font-semibold tabular-nums">{formatVnd(data.revenue.vnd, language)}</CardAction>
      </CardHeader>
      <CardContent>
        {max === 0 ? (
          <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("noRevenue")}</p>
        ) : (
          <>
            <div
              role="img"
              aria-label={t("dailyRevenueSummary", { days: data.days, vnd: formatVnd(data.revenue.vnd, language), max: formatVnd(max, language), day: dayLabel(peak!.day) })}
              className="flex h-40 items-end gap-px"
            >
              {data.daily.map((day) => (
                <div
                  key={day.day}
                  title={t("barTitle", { day: dayLabel(day.day), vnd: formatVnd(day.vnd, language), orders: day.orders, credits: formatNumber(day.creditsUsed, language) })}
                  className="group flex h-full min-w-0 flex-1 items-end"
                >
                  <div
                    className={cn("w-full rounded-t-sm transition-colors", day.vnd ? "bg-chart-1/80 group-hover:bg-chart-1" : "bg-muted")}
                    style={{ height: day.vnd ? `${Math.max(4, (day.vnd / max) * 100)}%` : "2px" }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{dayLabel(data.daily[0].day)}</span>
              <span>{dayLabel(data.daily[data.daily.length - 1].day)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CreditsUsedCard({ data }: { data: AdminFinance }) {
  const { t, language } = useFinanceMessages();
  const { spent, sold, granted, removed } = data.credits;
  const total = SPEND_KINDS.reduce((sum, kind) => sum + spent[kind], 0);
  const number = (value: number) => formatNumber(value, language);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("creditsUsed")}</CardTitle>
        <CardAction className="text-sm font-semibold tabular-nums">{t("creditsUsedTotal", { count: number(total) })}</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {SPEND_KINDS.map((kind) => spent[kind] > 0 && <div key={kind} className={SPEND_COLOR[kind]} style={{ width: `${(spent[kind] / total) * 100}%` }} />)}
        </div>
        <ul className="flex flex-col gap-2">
          {SPEND_KINDS.map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-full", SPEND_COLOR[kind])} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t(`kind_${kind}`)}</span>
              <span className="font-medium tabular-nums">{number(spent[kind])}</span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
          {[
            [t("sold"), sold],
            [t("granted"), granted],
            [t("removed"), removed],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{number(value as number)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function OrdersCard({ data }: { data: AdminFinance }) {
  const { t, language } = useFinanceMessages();
  const { paid, pending, cancelled } = data.orders;
  const total = paid + pending + cancelled;
  const rows: [TopUpStatus, number][] = [
    ["PAID", paid],
    ["PENDING", pending],
    ["CANCELLED", cancelled],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orders")}</CardTitle>
        <CardAction className="text-sm text-muted-foreground">{t("successRate", { rate: percent(paid, total, language) })}</CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {rows.map(([status, count]) => (
            <li key={status} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>{t(`status_${status}`)}</span>
                <span className="font-medium tabular-nums">{formatNumber(count, language)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className={cn("h-full rounded-full", status === "PAID" ? "bg-success" : status === "PENDING" ? "bg-warning" : "bg-muted-foreground/50")}
                  style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function TopBuyersCard({ data }: { data: AdminFinance }) {
  const { t, language } = useFinanceMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topBuyers")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.topBuyers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noBuyers")}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {data.topBuyers.map((buyer) => (
              <li key={buyer.user.id} className="flex items-center gap-3">
                <UserAvatar name={buyer.user.displayName} imageKey={buyer.user.avatarKey} className="size-8" />
                <div className="min-w-0 flex-1">
                  <Link href={`/players/${buyer.user.id}`} className="block truncate font-medium hover:underline">
                    {buyer.user.displayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{t("buyerOrders", { count: buyer.orders })}</p>
                </div>
                <span className="font-medium tabular-nums">{formatVnd(buyer.vnd, language)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentTopUpsCard({ data }: { data: AdminFinance }) {
  const { t, language } = useFinanceMessages();
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t("recentTopUps")}</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/credits">
              {t("openLedger")} <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.recentTopUps.length === 0 ? (
          <EmptyState icon={Receipt} title={t("noTopUps")} />
        ) : (
          <Table className={STACK_ON_PHONE}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colUser")}</TableHead>
                <TableHead>{t("colOrder")}</TableHead>
                <TableHead className="text-right">{t("colAmount")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-right">{t("colTime")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentTopUps.map((topUp) => (
                <TableRow key={topUp.orderCode}>
                  <TableCell>
                    <span className="flex min-w-0 items-center gap-2">
                      <UserAvatar name={topUp.user.displayName} imageKey={topUp.user.avatarKey} className="size-6" />
                      <span className="truncate">{topUp.user.displayName}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">#{topUp.orderCode}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="font-medium">{formatVnd(topUp.amountVnd, language)}</span>
                    <span className="block text-xs text-muted-foreground">{t("credits", { count: formatNumber(topUp.credits, language) })}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_TONE[topUp.status]}>
                      {t(`status_${topUp.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{formatDate(topUp.paidAt ?? topUp.createdAt, language, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
