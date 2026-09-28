"use client";

import Link from "next/link";
import { CircleAlert, Coins, ExternalLink, GitBranch, Medal, ScanLine, Users } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BracketView } from "@/features/offline-tournaments/components/bracket-view";
import { TournamentStatusBadge } from "@/features/offline-tournaments/components/status-badge";
import { TournamentMeta } from "@/features/offline-tournaments/components/tournament-meta";
import { formatVnd } from "@/features/offline-tournaments/format";
import { useAdminCup } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import type { AdminCupDetail } from "../detail-types";
import { formatNumber } from "../format";
import { AdminDetail } from "./admin-detail";
import { DetailHeader, FieldList, KPI_GRID, ListCard, PersonLink } from "./detail-parts";
import { KpiCard } from "./finance-cards";

export function CupDetail({ id }: { id: string }) {
  const { t } = useAdminDetailMessages();
  return (
    <AdminDetail query={useAdminCup(id)} backHref="/admin/cups" backLabel={t("backToCups")} notFound={{ icon: Medal, title: t("cupNotFound") }}>
      {(data) => <CupDetailBody data={data} />}
    </AdminDetail>
  );
}

function CupDetailBody({ data }: { data: AdminCupDetail }) {
  const { t, language } = useAdminDetailMessages();
  const { tournament, venue, entries, matches } = data;
  const number = (value: number) => formatNumber(value, language);
  const players = entries.flatMap((entry) => entry.players);
  const checkedIn = players.filter((player) => player.checkedIn).length;
  const paid = entries.filter((entry) => entry.paid).length;
  const disputed = matches.filter((match) => match.status === "DISPUTED");
  const teamName = (entryId: string | null) => entries.find((entry) => entry.id === entryId)?.teamName ?? "?";

  return (
    <>
      <DetailHeader
        avatar={
          <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Medal className="size-7" aria-hidden />
          </span>
        }
        title={tournament.title}
        badges={
          <>
            <GameBadge game={tournament.game} />
            <TournamentStatusBadge status={tournament.status} />
          </>
        }
        lines={[
          <>
            <Link href={`/admin/venues/${venue.id}`} className="hover:underline">
              {venue.name}
            </Link>{" "}
            · {tournament.venue.city}
          </>,
          <>
            {t("cupHost")}: <PersonLink person={venue.owner} />
          </>,
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/tournaments/${tournament.id}`}>
              <ExternalLink /> {t("openPublicPage")}
            </Link>
          </Button>
        }
      />

      <div className={KPI_GRID}>
        <KpiCard icon={Users} label={t("cupTeams")} value={`${number(entries.length)}/${number(tournament.maxTeams)}`} hints={[]} />
        <KpiCard icon={ScanLine} label={t("cupCheckedIn")} value={`${number(checkedIn)}/${number(players.length)}`} hints={[]} />
        <KpiCard
          icon={Coins}
          label={t("cupFees")}
          value={tournament.entryFee === 0 ? t("free") : formatVnd(paid * tournament.entryFee, language)}
          hints={tournament.entryFee === 0 ? [] : [t("cupFeesHint", { paid, total: entries.length })]}
        />
        <KpiCard icon={CircleAlert} label={t("cupDisputed")} value={number(disputed.length)} tone={disputed.length > 0 ? "text-destructive" : undefined} hints={[]} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("cupInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TournamentMeta tournament={tournament} />
            {tournament.rules && <FieldList fields={[{ label: t("fieldRules"), value: <span className="whitespace-pre-line">{tournament.rules}</span> }]} />}
          </CardContent>
        </Card>

        <ListCard title={t("cupEntries")} empty={t("noEntries")} emptyIcon={Users} isEmpty={entries.length === 0}>
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {entry.seed !== null && <span className="text-xs text-muted-foreground tabular-nums">#{entry.seed}</span>}
                  {entry.teamId ? (
                    <Link href={`/admin/teams/${entry.teamId}`} className="font-medium hover:underline">
                      {entry.teamName}
                    </Link>
                  ) : (
                    <span className="font-medium">{entry.teamName}</span>
                  )}
                  {tournament.entryFee > 0 && (
                    <Badge variant="outline" className={entry.paid ? "text-success" : "text-warning"}>
                      {t(entry.paid ? "entryPaid" : "entryUnpaid")}
                    </Badge>
                  )}
                  {entry.checkedIn && <Badge variant="outline" className="text-success">{t("entryCheckedIn")}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <PersonLink person={entry.captain} />
                  <span className="text-xs">{t("entryPlayers", { in: entry.players.filter((player) => player.checkedIn).length, total: entry.players.length })}</span>
                </div>
              </li>
            ))}
          </ul>
        </ListCard>
      </div>

      {disputed.length > 0 && (
        <ListCard title={t("cupDisputes")} empty="" emptyIcon={CircleAlert} isEmpty={false}>
          <ul className="flex flex-col gap-3">
            {disputed.map((match) => {
              const a = teamName(match.entryAId);
              const b = teamName(match.entryBId);
              return (
                <li key={match.id} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">
                    {a} vs {b}
                  </span>
                  {(["A", "B"] as const).map((side) => {
                    const report = match.reports?.[side];
                    const team = side === "A" ? a : b;
                    return (
                      <span key={side} className="text-muted-foreground tabular-nums">
                        {report ? t("reportBy", { team, a: report.scoreA, b: report.scoreB }) : t("noReport", { team })}
                      </span>
                    );
                  })}
                </li>
              );
            })}
          </ul>
        </ListCard>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("cupBracket")}</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <EmptyState icon={GitBranch} title={t("noBracket")} />
          ) : (
            <div className="overflow-x-auto">
              <BracketView format={tournament.format} matches={matches} entries={entries} championEntryId={tournament.championEntryId} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
