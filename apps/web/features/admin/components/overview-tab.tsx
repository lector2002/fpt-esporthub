"use client";

import { Flag, Gamepad2, MessageSquare, Send, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { QueryState } from "@/components/common/query-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GAMES } from "@/lib/contracts";
import { useAdminMetrics } from "../api";
import { useAdminMessages } from "../messages";

function MetricCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: number; hint?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

export function OverviewTab() {
  const { t } = useAdminMessages();
  const metrics = useAdminMetrics();

  return (
    <QueryState
      query={metrics}
      skeleton={
        <div className={GRID}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      }
    >
      {(data) => {
        const profiles = data.profilesByGame.valorant + data.profilesByGame.league_of_legends;
        const perGame = `${GAMES.valorant.short} ${data.profilesByGame.valorant} / ${GAMES.league_of_legends.short} ${data.profilesByGame.league_of_legends}`;
        return (
          <div className={GRID}>
            <MetricCard icon={Users} label={t("metricUsers")} value={data.usersTotal} hint={t("metricUsersNew", { count: data.usersNew7d })} />
            <MetricCard icon={Gamepad2} label={t("metricProfiles")} value={profiles} hint={perGame} />
            <MetricCard icon={Shield} label={t("metricTeams")} value={data.teams} />
            <MetricCard icon={Flag} label={t("metricOpenReports")} value={data.openReports} />
            <MetricCard icon={Send} label={t("metricPendingRequests")} value={data.pendingRequests} />
            <MetricCard icon={MessageSquare} label={t("metricMessages")} value={data.messages7d} />
          </div>
        );
      }}
    </QueryState>
  );
}
