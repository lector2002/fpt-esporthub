"use client";

import Link from "next/link";
import { ArrowLeft, Crown, Trophy, Users } from "lucide-react";
import { AramBadge, GameBadge } from "@/components/common/badges";
import { SplashBanner } from "@/components/common/champion-splash";
import { QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { teamLogoPaths } from "@/features/media/api";
import { AchievementsCard } from "@/features/media/components/achievement-gallery";
import { CoverEditor, PictureEditor } from "@/features/media/components/picture-editor";
import { SafetyMenu } from "@/features/safety/components/safety-menu";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useRoleOptions, useTeam } from "../api";
import { useTeamLabels } from "../labels";
import { useTeamMessages } from "../messages";
import type { LookupOption, TeamDetail } from "../types";
import { CaptainTools, TeamHeaderActions } from "./team-actions";
import { RoleChips, TeamStatusBadge } from "./team-card";
import { TeamRoster } from "./team-roster";

export function TeamDetailView({ id }: { id: string }) {
  const { t } = useTeamMessages();
  const query = useTeam(id);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/teams">
          <ArrowLeft /> {t("backToTeams")}
        </Link>
      </Button>
      <QueryState query={query} skeleton={<Skeleton className="h-64 w-full" />}>
        {(team) => <TeamDetailBody team={team} />}
      </QueryState>
    </div>
  );
}

function TeamDetailBody({ team }: { team: TeamDetail }) {
  const roles = useRoleOptions(team.game).data;
  const captain = team.viewerMembership === "captain";
  return (
    <>
      <TeamHeader team={team} />
      <div className={cn("grid gap-6", captain && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <div className="flex min-w-0 flex-col gap-6">
          <TeamRoster team={team} roles={roles} />
          <TeamAbout team={team} roles={roles} />
          <AchievementsCard achievements={team.achievements} owner={{ owner: "team", teamId: team.id }} canEdit={team.viewerMembership === "captain"} />
        </div>
        {captain && (
          <aside>
            <CaptainTools team={team} />
          </aside>
        )}
      </div>
    </>
  );
}

function TeamHeader({ team }: { team: TeamDetail }) {
  const { t } = useTeamMessages();
  const { user } = useSession();
  return (
    <header className="flex flex-col gap-4">
      <CoverEditor
        imageKey={team.coverKey}
        fallback="/images/team-cover.webp"
        paths={teamLogoPaths(team.id, team.viewerMembership === "captain", user, "cover")}
        fade="from-background"
        className="-mb-14 h-32 rounded-xl sm:h-44"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4 px-1 sm:px-4">
      <div className="flex min-w-0 items-center gap-4">
      <PictureEditor
        name={team.name}
        imageKey={team.logoKey}
        kind="team"
        paths={teamLogoPaths(team.id, team.viewerMembership === "captain", user)}
        className="size-16 text-xl"
      />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{team.name}</h1>
          <GameBadge game={team.game} />
          {team.mode === "aram" && <AramBadge />}
          <TeamStatusBadge team={team} />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Users className="size-4" aria-hidden />
            {t("memberCount", { count: team.memberCount, max: team.maxMembers })}
          </li>
          {team.mode !== "aram" && (
            <li className="flex items-center gap-1.5">
              <Trophy className="size-4" aria-hidden />
              {team.rankMin} - {team.rankMax}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Crown className="size-4" aria-hidden />
            {team.captain.displayName}
          </li>
        </ul>
      </div>
      </div>
      <div className="on-picture flex flex-wrap gap-2">
        <TeamHeaderActions team={team} />
        <SafetyMenu
          targetType="team"
          targetId={team.id}
          targetName={team.name}
          owner={{ id: team.captain.id, name: team.captain.displayName }}
        />
      </div>
      </div>
    </header>
  );
}

function TeamAbout({ team, roles }: { team: TeamDetail; roles: LookupOption[] | undefined }) {
  const { t } = useTeamMessages();
  const labels = useTeamLabels();
  const facts = [
    { label: t("schedule"), value: team.schedule.map(labels.slot).join(", ") },
    { label: t("goals"), value: team.goals.map(labels.goal).join(", ") },
    { label: t("commStyle"), value: labels.comm(team.communicationStyle) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("about")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="whitespace-pre-line text-muted-foreground">{team.description ?? t("noDescription")}</p>
        {team.mode !== "aram" && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-medium">{t("neededRoles")}</h3>
            <RoleChips roles={roles} values={team.neededRoles} />
          </div>
        )}
        <dl className="grid gap-3 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium">{fact.value || "-"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
