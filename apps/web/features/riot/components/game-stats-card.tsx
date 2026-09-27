"use client";

import Link from "next/link";
import { BarChart3, Link2 } from "lucide-react";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { usePublicRiotStats, useRiotStats } from "../api";
import { formatRelativeTime } from "../format";
import { useRiotMessages } from "../messages";
import { LolStatsView } from "./lol-stats-view";
import { RsoNote } from "./riot-connect-card";

const skeleton = (
  <div className="flex flex-col gap-3">
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
);

/** Own stats when `userId` is omitted, otherwise another player's public subset. */
export function GameStatsCard({ game, userId }: { game: GameSlug; userId?: string }) {
  return userId ? <PublicStats game={game} userId={userId} /> : <OwnStats game={game} />;
}

function StatsShell({
  game,
  syncedAt,
  level,
  children,
}: {
  game: GameSlug;
  syncedAt: string | null;
  level?: number;
  children: React.ReactNode;
}) {
  const { t, language } = useRiotMessages();
  const details = [
    level !== undefined ? t("level", { level }) : null,
    syncedAt ? t("updated", { time: formatRelativeTime(syncedAt, language) }) : null,
  ].filter(Boolean);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className={game === "valorant" ? "size-4 text-valorant" : "size-4 text-lol"} />
          {t("statsTitle", { game: GAMES[game].label })}
        </CardTitle>
        {details.length > 0 && <CardDescription>{details.join(" · ")}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OwnStats({ game }: { game: GameSlug }) {
  const { t } = useRiotMessages();
  const query = useRiotStats(game);
  const own = query.data?.status === "linked" || query.data?.status === "verified" ? query.data : null;

  return (
    <StatsShell game={game} syncedAt={own?.syncedAt ?? null} level={own?.stats?.summonerLevel}>
      <QueryState query={query} skeleton={skeleton}>
        {(data) => {
          if (data.status === "requires_rso") return <RsoNote />;
          if (data.status === "unlinked") {
            return (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{t("noStatsOwn")}</span>
                <Button asChild size="sm" variant="outline">
                  <Link href="/profile/me#riot-connect">
                    <Link2 /> {t("connect")}
                  </Link>
                </Button>
              </div>
            );
          }
          if (!data.stats) return <EmptyState icon={BarChart3} title={t("noStatsTitle")} description={t("noStatsSync")} />;
          return <LolStatsView stats={data.stats} roles={data.stats.roles} version={data.ddragonVersion} />;
        }}
      </QueryState>
    </StatsShell>
  );
}

function PublicStats({ game, userId }: { game: GameSlug; userId: string }) {
  const { t } = useRiotMessages();
  const query = usePublicRiotStats(userId, game);
  const syncedAt = query.data?.status === "linked" || query.data?.status === "verified" ? query.data.syncedAt : null;

  return (
    <StatsShell game={game} syncedAt={syncedAt}>
      <QueryState query={query} skeleton={skeleton}>
        {(data) => {
          if (data.status === "requires_rso") return <RsoNote />;
          if (!data.stats) return <EmptyState icon={BarChart3} title={t("noStatsTitle")} description={t("noStatsPublic")} />;
          return <LolStatsView stats={data.stats} version={data.ddragonVersion} />;
        }}
      </QueryState>
    </StatsShell>
  );
}
