"use client";

import Link from "next/link";
import { ArrowLeft, Lock, UserRound, Users } from "lucide-react";
import { AramBadge, GameBadge, ReputationBadge } from "@/components/common/badges";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SendRequestButton } from "@/features/requests/components/send-request-button";
import { useRoleOptions } from "@/features/teams/api";
import { roleLabel } from "@/features/teams/labels";
import { TeamJoinAction } from "@/features/teams/components/team-card";
import { formatRank, isAramOnly } from "@/lib/contracts";
import { useEvent } from "../api";
import { useEventMessages } from "../messages";
import type { EventDetail } from "../types";
import { EventMeta } from "./event-meta";
import { InterestToggle } from "./interest-toggle";
import { RegisterLink } from "./register-link";

export function EventDetailView({ id }: { id: string }) {
  const { t } = useEventMessages();
  const query = useEvent(id);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/events">
          <ArrowLeft /> {t("backToEvents")}
        </Link>
      </Button>
      <QueryState query={query} skeleton={<Skeleton className="h-64 w-full" />}>
        {(event) => <EventDetailBody event={event} />}
      </QueryState>
    </div>
  );
}

function EventDetailBody({ event }: { event: EventDetail }) {
  const { t } = useEventMessages();
  const ended = new Date(event.startsAt).getTime() < Date.now();

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
            <GameBadge game={event.game} />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("organizer")}: {event.organizer}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InterestToggle event={event} />
          <RegisterLink event={event} size="default" />
        </div>
      </header>
      {ended && (
        <Alert>
          <Lock />
          <AlertTitle>{t("ended")}</AlertTitle>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <EventMeta event={event} />
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-medium">{t("rules")}</h2>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{event.rules ?? t("noRules")}</p>
            </div>
          </CardContent>
        </Card>
        {!ended && <FindTeammates event={event} />}
      </div>
    </>
  );
}

function FindTeammates({ event }: { event: EventDetail }) {
  const { t } = useEventMessages();
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-labelledby="find-teammates-heading">
      <h2 id="find-teammates-heading" className="text-lg font-semibold">
        {t("findTeammates")}
      </h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <InterestedPlayers event={event} />
        <RecruitingTeams event={event} />
      </div>
    </section>
  );
}

function InterestedPlayers({ event }: { event: EventDetail }) {
  const { t } = useEventMessages();
  const roles = useRoleOptions(event.game).data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("interestedPlayers")}</CardTitle>
      </CardHeader>
      <CardContent>
        {event.interestedPlayers.length === 0 ? (
          <EmptyState icon={UserRound} title={t("noInterestedPlayers")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {event.interestedPlayers.map((player) => (
              <li key={player.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <UserAvatar name={player.displayName} imageKey={player.avatarKey} />
                <div className="min-w-0 flex-1">
                  <Link href={`/players/${player.id}`} className="block truncate font-medium hover:text-primary">
                    {player.displayName}
                  </Link>
                  {isAramOnly(player.playModes) ? (
                    <AramBadge className="mt-1" />
                  ) : (
                    <p className="truncate text-sm text-muted-foreground">
                      {formatRank(player)} · {roleLabel(roles, player.role)}
                    </p>
                  )}
                </div>
                <ReputationBadge badge={player.reputationBadge} className="hidden sm:inline-flex" />
                <SendRequestButton targetType="player" targetId={player.id} targetName={player.displayName} variant="outline" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecruitingTeams({ event }: { event: EventDetail }) {
  const { t } = useEventMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recruitingTeams")}</CardTitle>
      </CardHeader>
      <CardContent>
        {event.recruitingTeams.length === 0 ? (
          <EmptyState icon={Users} title={t("noRecruitingTeams")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {event.recruitingTeams.map((team) => (
              <li key={team.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Link href={`/teams/${team.id}`} className="block truncate font-medium hover:text-primary">
                    {team.name}
                  </Link>
                  <p className="truncate text-sm text-muted-foreground">
                    {t("memberCount", { count: team.memberCount, max: team.maxMembers })}
                    {team.mode !== "aram" && ` · ${team.rankMin} - ${team.rankMax}`}
                  </p>
                  {team.mode === "aram" && <AramBadge className="mt-1" />}
                </div>
                <TeamJoinAction team={team} variant="outline" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
