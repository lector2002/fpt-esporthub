"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Clock, LogOut, Settings, Swords, Users } from "lucide-react";
import { toast } from "sonner";
import { GameBadge } from "@/components/common/badges";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyTeams } from "@/features/teams/api";
import { ConfirmAction } from "@/features/teams/components/confirm-action";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useOfflineTournament, useWithdrawEntry } from "../api";
import { useOfflineMessages } from "../messages";
import type { TournamentDetail, TournamentEntry, TournamentMatch } from "../types";
import { BracketView } from "./bracket-view";
import { CheckInQr } from "./check-in-qr";
import { RegisterDialog } from "./register-dialog";
import { ResultDialog } from "./result-dialog";
import { TournamentStatusBadge } from "./status-badge";
import { TournamentMeta } from "./tournament-meta";

export function OfflineTournamentDetail({ id }: { id: string }) {
  const { t } = useOfflineMessages();
  const query = useOfflineTournament(id);
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/events?type=offline">
          <ArrowLeft /> {t("backToList")}
        </Link>
      </Button>
      <QueryState query={query} skeleton={<Skeleton className="h-64 w-full" />}>
        {(detail) => <DetailBody detail={detail} />}
      </QueryState>
    </div>
  );
}

function DetailBody({ detail }: { detail: TournamentDetail }) {
  const { t } = useOfflineMessages();
  const { user } = useSession();
  const { tournament, entries, matches, myEntryId, myCheckIn, isHost } = detail;
  const myEntry = entries.find((entry) => entry.id === myEntryId) ?? null;
  const isCaptain = myEntry?.captainId === user?.id;
  const [reporting, setReporting] = useState<TournamentMatch | null>(null);
  const teamName = (entryId: string | null) => entries.find((entry) => entry.id === entryId)?.teamName ?? t("tbd");
  const myMatch = isCaptain ? matches.find((m) => isPlayable(m) && (m.entryAId === myEntryId || m.entryBId === myEntryId)) : undefined;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TournamentStatusBadge status={tournament.status} />
            <GameBadge game={tournament.game} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isHost && (
            <Button asChild variant="outline">
              <Link href={`/host/tournaments/${tournament.id}`}>
                <Settings /> {t("manage")}
              </Link>
            </Button>
          )}
          <EntryAction detail={detail} isCaptain={isCaptain} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {myCheckIn && <CheckInQr code={myCheckIn.code} checkedIn={myCheckIn.checkedIn} />}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <TournamentMeta tournament={tournament} />
              <div className="flex flex-col gap-1.5">
                <h2 className="text-sm font-medium">{t("rules")}</h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{tournament.rules ?? t("noRules")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {myMatch && <MyMatchCard match={myMatch} mySlot={myMatch.entryAId === myEntryId ? "A" : "B"} teamName={teamName} onReport={() => setReporting(myMatch)} />}
          {matches.length > 0 ? (
            <section className="flex flex-col gap-3" aria-labelledby="bracket-heading">
              <h2 id="bracket-heading" className="text-lg font-semibold">
                {t("bracket")}
              </h2>
              <BracketView
                format={tournament.format}
                matches={matches}
                entries={entries}
                championEntryId={tournament.championEntryId}
                highlightEntryId={myEntryId}
              />
            </section>
          ) : (
            <EntryList entries={entries} myEntryId={myEntryId} max={tournament.maxTeams} />
          )}
        </div>
      </div>
      <ResultDialog match={reporting} teamName={teamName} as="captain" onClose={() => setReporting(null)} />
    </>
  );
}

const isPlayable = (match: TournamentMatch) => match.status === "READY" || match.status === "DISPUTED";

function EntryAction({ detail, isCaptain }: { detail: TournamentDetail; isCaptain: boolean }) {
  const { t } = useOfflineMessages();
  const withdraw = useWithdrawEntry(detail.tournament.id);
  const { tournament, myEntryId } = detail;
  const open = tournament.status === "REGISTRATION" || tournament.status === "CHECK_IN";

  if (myEntryId) {
    if (!isCaptain || !open) return null;
    return (
      <ConfirmAction
        trigger={
          <Button variant="outline" disabled={withdraw.isPending}>
            <LogOut /> {t("withdraw")}
          </Button>
        }
        title={t("withdrawTitle")}
        description={t("withdrawDescription")}
        confirmLabel={t("withdraw")}
        onConfirm={() =>
          withdraw.mutate(undefined, {
            onSuccess: () => toast.success(t("withdrawn")),
            onError: (error) => toast.error(error.message),
          })
        }
      />
    );
  }
  if (tournament.status !== "REGISTRATION") return open ? <Badge variant="outline">{t("registrationClosed")}</Badge> : null;
  if (tournament.entryCount >= tournament.maxTeams) return <Badge variant="outline">{t("full")}</Badge>;
  return <RegisterEntry tournament={tournament} />;
}

/** Shows what is missing before the click: a team you captain, then enough members for the cup's team size. */
function RegisterEntry({ tournament }: { tournament: TournamentDetail["tournament"] }) {
  const { t } = useOfflineMessages();
  const teams = useMyTeams(tournament.game);
  if (teams.isPending) return <Skeleton className="h-9 w-36" />;
  const captained = (teams.data ?? []).filter((team) => team.viewerMembership === "captain");
  const ready = captained.some((team) => team.memberCount >= tournament.teamSize);
  if (ready) return <RegisterDialog tournament={tournament} />;

  const short = captained[0];
  return (
    <div className="flex flex-col items-end gap-1">
      <Button asChild variant="outline">
        {short ? (
          <Link href={`/teams/${short.id}`}>
            <Users /> {t("needMembers", { count: tournament.teamSize - short.memberCount })}
          </Link>
        ) : (
          <Link href="/teams/new">
            <Users /> {t("createTeamToRegister")}
          </Link>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">{t("registerNeeds", { size: tournament.teamSize })}</p>
    </div>
  );
}

function MyMatchCard({
  match,
  mySlot,
  teamName,
  onReport,
}: {
  match: TournamentMatch;
  mySlot: "A" | "B";
  teamName: (entryId: string | null) => string;
  onReport: () => void;
}) {
  const { t } = useOfflineMessages();
  const reported = Boolean(match.reports?.[mySlot]);
  return (
    <Card className="border-primary/40">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Swords className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {teamName(match.entryAId)} vs {teamName(match.entryBId)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("bestOfShort", { count: match.bestOf })}
              {match.status === "DISPUTED" ? ` · ${t("disputed")}` : reported ? ` · ${t("waitingOpponent")}` : ""}
            </p>
          </div>
        </div>
        <Button onClick={onReport} variant={reported ? "outline" : "default"}>
          {t("reportResult")}
        </Button>
      </CardContent>
    </Card>
  );
}

function EntryList({ entries, myEntryId, max }: { entries: TournamentEntry[]; myEntryId: string | null; max: number }) {
  const { t } = useOfflineMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("teams", { count: `${entries.length}/${max}` })}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Users} title={t("noEntries")} description={t("bracketPending")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className={cn("flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{entry.teamName}</span>
                  {entry.id === myEntryId && <Badge variant="secondary">{t("yourTeam")}</Badge>}
                  <span className={cn("ml-auto flex items-center gap-1 text-xs", entry.checkedIn ? "text-emerald-400" : "text-muted-foreground")}>
                    {entry.checkedIn ? <CircleCheck className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
                    {t(entry.checkedIn ? "checkedIn" : "notCheckedIn")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{entry.players.map((p) => p.displayName).join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
