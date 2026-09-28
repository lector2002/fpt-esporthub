"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BoostProfileCard } from "@/features/credits/components/promotions";
import { GameStatsCard } from "@/features/riot/components/game-stats-card";
import { gameSlug } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { useDashboard } from "../api";
import { useDashboardMessages } from "../messages";
import { DailyMatchesCard } from "./daily-matches-card";
import { IdentityHeader } from "./identity-header";
import { StatStrip } from "./stat-strip";
import { TodoCard } from "./todo-card";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function DashboardScreen() {
  const { t } = useDashboardMessages();
  const { game } = useActiveGame();
  const { profiles } = useSession();
  const query = useDashboard(game);

  if (!game) return <DashboardSkeleton />;
  const boostedUntil = profiles.find((item) => gameSlug(item.game) === game)?.boostedUntil;

  return (
    <QueryState query={query} skeleton={<DashboardSkeleton />}>
      {(view) =>
        view.profile ? (
          <div className="flex flex-col gap-6">
            <IdentityHeader view={view} game={game} profile={view.profile} />
            <StatStrip counts={view.counts} readiness={view.readiness} />
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-6">
                <GameStatsCard game={game} />
                {view.readiness && <TodoCard readiness={view.readiness} />}
              </div>
              <div className="flex flex-col gap-6">
                <BoostProfileCard game={game} boostedUntil={boostedUntil} />
                <DailyMatchesCard matches={view.dailyMatches} aram={view.playMode === "aram"} />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={UserPlus}
            title={t("noProfile")}
            action={
              <Button asChild>
                <Link href={`/onboarding?game=${game}`}>{t("createProfile")}</Link>
              </Button>
            }
          />
        )
      }
    </QueryState>
  );
}
