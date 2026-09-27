"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, ClipboardList, Clock, DoorOpen, Monitor, Play, QrCode, Swords, Trophy, Undo2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { StepStrip } from "@/components/common/step-strip";
import { GameBadge } from "@/components/common/badges";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmAction } from "@/features/teams/components/confirm-action";
import { cn } from "@/lib/utils";
import { useOfflineTournament, useSetTournamentStatus, useStartTournament, useUpdateEntry, type HostStatusChange } from "../api";
import { useOfflineMessages } from "../messages";
import type { TournamentDetail, TournamentMatch, TournamentStatus } from "../types";
import { BracketView } from "./bracket-view";
import { ResultDialog } from "./result-dialog";
import { TournamentStatusBadge } from "./status-badge";
import { TournamentMeta } from "./tournament-meta";

export function HostTournamentPage({ id }: { id: string }) {
  const { t } = useOfflineMessages();
  const query = useOfflineTournament(id);
  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/host">
          <ArrowLeft /> {t("hostTitle")}
        </Link>
      </Button>
      <QueryState query={query} skeleton={<Skeleton className="h-64 w-full" />}>
        {(detail) => (detail.isHost ? <HostBody detail={detail} /> : <EmptyState icon={XCircle} title={t("tvNotFound")} />)}
      </QueryState>
    </div>
  );
}

const PHASES: { status: TournamentStatus; icon: typeof Trophy }[] = [
  { status: "REGISTRATION", icon: ClipboardList },
  { status: "CHECK_IN", icon: QrCode },
  { status: "LIVE", icon: Swords },
  { status: "COMPLETED", icon: Trophy },
];

/** Where the cup is in its life: registration, check-in, live, done. Completed marks every phase done. */
function PhaseStepper({ status }: { status: TournamentStatus }) {
  const { t } = useOfflineMessages();
  if (status === "CANCELLED") return null;
  const index = PHASES.findIndex((phase) => phase.status === status);
  const current = status === "COMPLETED" ? PHASES.length : index;
  return <StepStrip steps={PHASES.map((phase) => ({ icon: phase.icon, label: t(`status_${phase.status}`) }))} current={current} />;
}

const isPlayable = (match: TournamentMatch) => match.status === "READY" || match.status === "DISPUTED";

function HostBody({ detail }: { detail: TournamentDetail }) {
  const { t } = useOfflineMessages();
  const { tournament, entries, matches } = detail;
  const [selected, setSelected] = useState<TournamentMatch | null>(null);
  const teamName = (entryId: string | null) => entries.find((entry) => entry.id === entryId)?.teamName ?? t("tbd");
  const disputed = matches.filter((m) => m.status === "DISPUTED").length;

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
        <HostActions detail={detail} />
      </header>
      <PhaseStepper status={tournament.status} />

      {disputed > 0 && (
        <Alert className="border-amber-500/50">
          <CircleAlert className="text-amber-400" />
          <AlertTitle>{t("needsDecision", { count: disputed })}</AlertTitle>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="self-start">
          <CardContent>
            <TournamentMeta tournament={tournament} />
          </CardContent>
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          {matches.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="host-bracket-heading">
              <h2 id="host-bracket-heading" className="text-lg font-semibold">
                {t("bracket")}
              </h2>
              <BracketView
                format={tournament.format}
                matches={matches}
                entries={entries}
                championEntryId={tournament.championEntryId}
                canSelect={(match) => tournament.status === "LIVE" && isPlayable(match)}
                onSelect={setSelected}
              />
            </section>
          )}
          <EntriesTable detail={detail} />
        </div>
      </div>
      <ResultDialog match={selected} teamName={teamName} as="host" onClose={() => setSelected(null)} />
    </>
  );
}

function HostActions({ detail }: { detail: TournamentDetail }) {
  const { t } = useOfflineMessages();
  const { tournament, entries } = detail;
  const setStatus = useSetTournamentStatus(tournament.id);
  const start = useStartTournament(tournament.id);
  const checkedIn = entries.filter((entry) => entry.checkedIn).length;
  const minimum = tournament.format === "DOUBLE_ELIMINATION" ? 3 : 2;

  const change = (status: HostStatusChange) =>
    setStatus.mutate(status, {
      onSuccess: () => toast.success(t("statusChanged")),
      onError: (error) => toast.error(error.message),
    });

  const { status } = tournament;
  if (status === "COMPLETED" || status === "CANCELLED") return <TvLink id={tournament.id} hidden={status === "CANCELLED"} />;

  return (
    <div className="flex flex-wrap gap-2">
      {status === "REGISTRATION" && (
        <Button onClick={() => change("CHECK_IN")} disabled={setStatus.isPending}>
          <DoorOpen /> {t("openCheckIn")}
        </Button>
      )}
      {status === "CHECK_IN" && (
        <>
          <Button asChild variant="outline">
            <Link href="/host/check-in">
              <QrCode /> {t("scanCheckIn")}
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => change("REGISTRATION")} disabled={setStatus.isPending}>
            <Undo2 /> {t("reopenRegistration")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={checkedIn < minimum || start.isPending} title={checkedIn < minimum ? t("needMoreTeams", { count: minimum }) : undefined}>
                <Play /> {t("startBracket")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("startTitle", { count: checkedIn })}</AlertDialogTitle>
                <AlertDialogDescription>{t("startDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    start.mutate(undefined, {
                      onSuccess: () => toast.success(t("started")),
                      onError: (error) => toast.error(error.message),
                    })
                  }
                >
                  {t("startBracket")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      <TvLink id={tournament.id} />
      <ConfirmAction
        trigger={
          <Button variant="ghost" className="text-destructive" disabled={setStatus.isPending}>
            <XCircle /> {t("cancelTournament")}
          </Button>
        }
        title={t("cancelTitle")}
        description={t("cancelDescription")}
        confirmLabel={t("cancelTournament")}
        onConfirm={() => change("CANCELLED")}
      />
    </div>
  );
}

function TvLink({ id, hidden = false }: { id: string; hidden?: boolean }) {
  const { t } = useOfflineMessages();
  if (hidden) return null;
  return (
    <Button asChild variant="outline">
      <a href={`/tv/tournaments/${id}`} target="_blank" rel="noreferrer">
        <Monitor /> {t("tvScreen")}
      </a>
    </Button>
  );
}

function EntriesTable({ detail }: { detail: TournamentDetail }) {
  const { t } = useOfflineMessages();
  const { tournament, entries } = detail;
  const update = useUpdateEntry(tournament.id);
  const checkInOpen = tournament.status === "CHECK_IN";

  const save = (entryId: string, body: { paid?: boolean; checkedIn?: boolean }) =>
    update.mutate(
      { entryId, ...body },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("entriesTitle", { count: entries.length, max: tournament.maxTeams })}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Clock} title={t("noEntries")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colTeam")}</TableHead>
                <TableHead>{t("colPlayers")}</TableHead>
                <TableHead>{t("colPaid")}</TableHead>
                <TableHead>{t("colCheckIn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const playersIn = entry.players.filter((p) => p.checkedIn).length;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.seed !== null && <span className="mr-2 text-muted-foreground">{t("seed", { seed: entry.seed })}</span>}
                      {entry.teamName}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        {entry.players.map((player) => (
                          <li key={player.userId} className={cn("flex items-center gap-1", player.checkedIn ? "text-foreground" : "text-muted-foreground")}>
                            {player.checkedIn ? <CircleCheck className="size-3.5 text-emerald-400" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
                            {player.displayName}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={entry.paid === true}
                        onCheckedChange={(paid) => save(entry.id, { paid })}
                        disabled={update.isPending}
                        aria-label={`${t("colPaid")}: ${entry.teamName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.checkedIn}
                          onCheckedChange={(checkedIn) => save(entry.id, { checkedIn })}
                          disabled={!checkInOpen || update.isPending}
                          aria-label={`${t("colCheckIn")}: ${entry.teamName}`}
                        />
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {t("playersCheckedIn", { count: playersIn, total: entry.players.length })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
