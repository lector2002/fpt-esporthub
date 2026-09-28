"use client";

import Link from "next/link";
import { ExternalLink, Inbox, MessagesSquare, Shield, ShieldX, Trophy, Flag, Users } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TournamentStatusBadge } from "@/features/offline-tournaments/components/status-badge";
import { useAdminTeam } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import type { AdminTeamDetail } from "../detail-types";
import { formatDate, formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import { AdminDetail } from "./admin-detail";
import { DetailHeader, FieldList, KPI_GRID, ListCard, PersonLink, ReportsCard } from "./detail-parts";
import { KpiCard } from "./finance-cards";
import { RecruitmentSwitch } from "./teams-tab";

export function TeamDetail({ id }: { id: string }) {
  const { t } = useAdminDetailMessages();
  return (
    <AdminDetail query={useAdminTeam(id)} backHref="/admin/teams" backLabel={t("backToTeams")} notFound={{ icon: ShieldX, title: t("teamNotFound") }}>
      {(data) => <TeamDetailBody data={data} />}
    </AdminDetail>
  );
}

function TeamDetailBody({ data }: { data: AdminTeamDetail }) {
  const { t, language } = useAdminDetailMessages();
  const admin = useAdminMessages().t;
  const { team, reports, listLimit } = data;
  const number = (value: number) => formatNumber(value, language);
  const featured = team.featuredUntil && new Date(team.featuredUntil) > new Date();
  const list = (values: string[]) => values.join(", ");

  return (
    <>
      <DetailHeader
        avatar={<UserAvatar name={team.name} imageKey={team.logoKey} kind="team" className="size-16 text-xl" />}
        title={team.name}
        badges={
          <>
            <GameBadge game={team.game} />
            {team.mode === "aram" && <Badge variant="secondary">{t("modeAram")}</Badge>}
            {featured && <Badge variant="outline">{t("teamFeatured", { date: formatDate(team.featuredUntil!, language) })}</Badge>}
          </>
        }
        lines={[
          <>
            {admin("colCaptain")}: <PersonLink person={team.captain} />
          </>,
          `${team.rankMin} - ${team.rankMax} · ${admin("colCreated")} ${formatDate(team.createdAt, language)}`,
        ]}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm">
              {admin("colRecruitment")}
              <RecruitmentSwitch team={team} />
            </label>
            <Button asChild variant="outline" size="sm">
              <Link href={`/teams/${team.id}`}>
                <ExternalLink /> {t("openPublicPage")}
              </Link>
            </Button>
          </>
        }
      />

      <div className={KPI_GRID}>
        <KpiCard icon={Users} label={t("teamMembers")} value={number(team.members.length)} hints={[]} />
        <KpiCard icon={Inbox} label={t("teamPending")} value={number(team.pendingRequests)} tone={team.pendingRequests > 0 ? "text-warning" : undefined} hints={[]} />
        <KpiCard icon={MessagesSquare} label={t("teamMessages")} value={number(team.messageCount)} hints={[]} />
        <KpiCard icon={Flag} label={t("teamReports")} value={number(reports.length)} tone={reports.length > 0 ? "text-destructive" : undefined} hints={[]} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListCard title={t("teamRoster")} empty={t("none")} emptyIcon={Users} isEmpty={team.members.length === 0}>
          <ul className="flex flex-col gap-2">
            {team.members.map((member) => (
              <li key={member.user.id} className="flex flex-wrap items-center gap-2 text-sm">
                <PersonLink person={member.user} />
                {member.user.id === team.captain.id && <Badge variant="outline">{admin("captain")}</Badge>}
                {member.user.status !== "ACTIVE" && <Badge variant="outline">{admin(`status_${member.user.status}`)}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{t("joinedOn", { date: formatDate(member.createdAt, language) })}</span>
              </li>
            ))}
          </ul>
        </ListCard>

        <ListCard title={t("teamAbout")} empty={t("none")} emptyIcon={Shield} isEmpty={false}>
          <FieldList
            fields={[
              { label: t("fieldNeededRoles"), value: list(team.neededRoles) },
              { label: t("fieldSchedule"), value: list(team.schedule) },
              { label: t("fieldGoals"), value: list(team.goals) },
              { label: t("fieldCommunication"), value: team.communicationStyle },
              { label: t("fieldDescription"), value: team.description },
            ]}
          />
        </ListCard>
      </div>

      <ListCard
        title={t("teamRequests")}
        empty={t("noRequests")}
        emptyIcon={Inbox}
        isEmpty={team.requests.length === 0}
        note={team.requests.length >= listLimit ? t("latestOnly", { count: listLimit }) : null}
      >
        <ul className="flex flex-col gap-2">
          {team.requests.map((request) => {
            const applied = request.type === "PLAYER_TO_TEAM";
            const player = applied ? request.sender : request.receiver;
            return (
              <li key={request.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{t(applied ? "reqApplied" : "reqInvited")}</Badge>
                {player && <PersonLink person={player} />}
                <Badge variant="outline" className={request.status === "PENDING" ? "text-warning" : undefined}>
                  {t(`reqStatus_${request.status}`)}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatDate(request.createdAt, language)}</span>
              </li>
            );
          })}
        </ul>
      </ListCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListCard title={t("teamCups")} empty={t("noCups")} emptyIcon={Trophy} isEmpty={team.tournamentEntries.length === 0}>
          <ul className="flex flex-col gap-2">
            {team.tournamentEntries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/admin/cups/${entry.tournament.id}`} className="min-w-0 truncate font-medium hover:underline">
                  {entry.tournament.title}
                </Link>
                <TournamentStatusBadge status={entry.tournament.status} />
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatDate(entry.tournament.startsAt, language)}</span>
              </li>
            ))}
          </ul>
        </ListCard>
        <ReportsCard title={t("teamReportsTitle")} reports={reports} listLimit={listLimit} />
      </div>
    </>
  );
}
