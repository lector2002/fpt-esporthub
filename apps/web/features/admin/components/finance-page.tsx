"use client";

import { useState } from "react";
import { Coins, GraduationCap, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatVnd } from "@/features/offline-tournaments/format";
import { useAdminFinance } from "../api";
import { useFinanceMessages } from "../finance-messages";
import { formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import { FINANCE_PERIODS, type AdminFinance, type FinancePeriod } from "../types";
import { CreditsUsedCard, KpiCard, OrdersCard, RecentTopUpsCard, RevenueChart, TopBuyersCard } from "./finance-cards";

const KPI_GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

export function FinancePage() {
  const { t } = useFinanceMessages();
  const admin = useAdminMessages();
  const [days, setDays] = useState<FinancePeriod>(30);
  const finance = useAdminFinance(days);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={admin.t("tabFinance")}
        description={t("description")}
        actions={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(days)}
            onValueChange={(value) => value && setDays(Number(value) as FinancePeriod)}
            aria-label={t("period")}
          >
            {FINANCE_PERIODS.map((period) => (
              <ToggleGroupItem key={period} value={String(period)} className="data-[state=on]:text-primary">
                {t("periodDays", { days: period })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      <QueryState
        query={finance}
        skeleton={
          <div className="flex flex-col gap-3">
            <div className={KPI_GRID}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(data) => <FinanceBody data={data} />}
      </QueryState>
    </div>
  );
}

function FinanceBody({ data }: { data: AdminFinance }) {
  const { t, language } = useFinanceMessages();
  const vnd = (amount: number) => formatVnd(amount, language);
  const { revenue, credits } = data;
  const delta = revenue.previousVnd ? (revenue.vnd - revenue.previousVnd) / revenue.previousVnd : null;
  const deltaText =
    delta === null
      ? t("revenueNoPrevious")
      : t("revenueDelta", {
          delta: new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(delta),
          days: data.days,
        });

  return (
    <div className="flex flex-col gap-3">
      <div className={KPI_GRID}>
        <KpiCard icon={Wallet} label={t("revenue")} value={vnd(revenue.vnd)} tone="text-primary" hints={[deltaText, t("revenueAllTime", { vnd: vnd(revenue.allTimeVnd) })]} />
        <KpiCard
          icon={Receipt}
          label={t("paidOrders")}
          value={formatNumber(revenue.orders, language)}
          hints={[t("payingUsers", { count: revenue.payingUsers, avg: vnd(revenue.orders ? Math.round(revenue.vnd / revenue.orders) : 0) })]}
        />
        <KpiCard
          icon={Coins}
          label={t("outstanding")}
          value={t("credits", { count: formatNumber(credits.outstanding, language) })}
          hints={[t("outstandingHint", { vnd: vnd(credits.outstanding * data.creditVnd) })]}
        />
        <KpiCard
          icon={GraduationCap}
          label={t("coachingOwed")}
          value={t("credits", { count: formatNumber(credits.coachingOwed, language) })}
          tone={credits.coachingOwed > 0 ? "text-warning" : undefined}
          hints={[t("coachingOwedHint", { vnd: vnd(credits.coachingOwed * data.creditVnd) })]}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <RevenueChart data={data} />
        <CreditsUsedCard data={data} />
        <RecentTopUpsCard data={data} />
        <div className="flex flex-col gap-3">
          <OrdersCard data={data} />
          <TopBuyersCard data={data} />
        </div>
      </div>
    </div>
  );
}
