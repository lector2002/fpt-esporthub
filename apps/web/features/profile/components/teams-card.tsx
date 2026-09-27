"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfileMessages } from "../messages";
import type { MyTeam } from "../types";

export function TeamsCard({ teams }: { teams: MyTeam[] }) {
  const { t } = useProfileMessages();

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("noTeams")}
        action={
          <Button asChild variant="outline">
            <Link href="/teams">{t("browseTeams")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {teams.map((team) => (
        <li key={team.id}>
          <Link
            href={`/teams/${team.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex min-w-0 items-center gap-3">
              <GameBadge game={team.game} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{team.name}</p>
                <p className="text-xs text-muted-foreground">
                  {team.role === "captain" ? t("captain") : t("member")} · {t("memberCount", { count: team.memberCount })}
                </p>
              </div>
            </div>
            {team.recruitmentOpen && <Badge variant="outline">{t("recruiting")}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
