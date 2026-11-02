"use client";

import { useState } from "react";
import { Handshake, MessageSquare, Shield, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityMessages } from "../activity-messages";
import { useAdminActivity } from "../api";
import { formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import type { AdminActivity, FinancePeriod } from "../types";
import { KpiCard } from "./finance-cards";
import { ActiveChart, AttentionCard, LeaderCard, NewTeamsCard, PlacesCard, Sparkline } from "./activity-cards";
import { PeriodToggle } from "./period-toggle";

const KPI_GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

/** Admin home for the community: who joined, chatted, connected and built teams in the chosen period. */
export function ActivityPage() {
  const { t } = useActivityMessages();
  const admin = useAdminMessages();
  const [days, setDays] = useState<FinancePeriod>(30);
  const activity = useAdminActivity(days);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={admin.t("tabOverview")} description={t("description")} actions={<PeriodToggle value={days} onChange={setDays} />} />
      <QueryState
        query={activity}
        skeleton={
          <div className="flex flex-col gap-3">
            <div className={KPI_GRID}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-36" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(data) => <ActivityBody data={data} />}
      </QueryState>
    </div>
  );
}

function ActivityBody({ data }: { data: AdminActivity }) {
  const { t, language } = useActivityMessages();
  const number = (value: number) => formatNumber(value, language);
  const change = (now: number, before: number) => {
    if (before === 0) return t("deltaNone", { days: data.days });
    if (now === before) return t("deltaSame", { days: data.days });
    const delta = new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format((now - before) / before);
    return t("delta", { delta, days: data.days });
  };
  const { users, messages, connections, teams } = data;

  return (
    <div className="flex flex-col gap-3">
      <div className={KPI_GRID}>
        <KpiCard icon={UserPlus} label={t("newUsers")} value={number(users.new)} hints={[change(users.new, users.previous), t("onboarded", { count: number(users.onboarded), total: number(users.total) })]}>
          <Sparkline data={data} metric="signups" label={t("newUsers")} />
        </KpiCard>
        <KpiCard icon={MessageSquare} label={t("messages")} value={number(messages.total)} hints={[change(messages.total, messages.previous)]}>
          <Sparkline data={data} metric="messages" label={t("messages")} />
        </KpiCard>
        <KpiCard
          icon={Handshake}
          label={t("connections")}
          value={number(connections.made)}
          hints={[change(connections.made, connections.previous), t("connectionsHint", { count: number(connections.requestsSent) })]}
        >
          <Sparkline data={data} metric="connections" label={t("connections")} />
        </KpiCard>
        <KpiCard
          icon={Shield}
          label={t("teams")}
          value={number(teams.created)}
          hints={[change(teams.created, teams.previous), t("teamsByGame", { lol: teams.byGame.league_of_legends ?? 0, valorant: teams.byGame.valorant ?? 0 })]}
        >
          <Sparkline data={data} metric="teams" label={t("teams")} />
        </KpiCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <ActiveChart data={data} />
        <div className="flex flex-col gap-3">
          <AttentionCard data={data} />
          <PlacesCard data={data} />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <LeaderCard title={t("topChatters")} leaders={data.topChatters.map(({ user, messages: count }) => ({ user, detail: number(count) }))} />
        <LeaderCard title={t("topConnectors")} leaders={data.topConnectors.map(({ user, connections: count }) => ({ user, detail: number(count) }))} />
        <NewTeamsCard data={data} />
      </div>
    </div>
  );
}
