"use client";

import Link from "next/link";
import { CalendarClock, ExternalLink, Heart, Trophy, UserCheck } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminEvent } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import type { AdminEventDetail } from "../detail-types";
import { formatDate, formatNumber } from "../format";
import { AdminDetail } from "./admin-detail";
import { DetailHeader, FieldList, KPI_GRID, ListCard, PersonLink } from "./detail-parts";
import { KpiCard } from "./finance-cards";

export function EventDetail({ id }: { id: string }) {
  const { t } = useAdminDetailMessages();
  return (
    <AdminDetail query={useAdminEvent(id)} backHref="/admin/events" backLabel={t("backToEvents")} notFound={{ icon: Trophy, title: t("eventNotFound") }}>
      {(data) => <EventDetailBody data={data} />}
    </AdminDetail>
  );
}

function EventDetailBody({ data }: { data: AdminEventDetail }) {
  const { t, language } = useAdminDetailMessages();
  const { event, interests, listLimit } = data;
  const date = (value: string) => formatDate(value, language, true);

  return (
    <>
      <DetailHeader
        avatar={
          <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="size-7" aria-hidden />
          </span>
        }
        title={event.title}
        badges={
          <>
            <GameBadge game={event.game} />
            <Badge variant="outline" className={event.registrationOpen ? "text-success" : "text-muted-foreground"}>
              {t(event.registrationOpen ? "regOpen" : "regClosed")}
            </Badge>
          </>
        }
        lines={[`${event.organizer} · ${date(event.startsAt)}`]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/events/${event.id}`}>
              <ExternalLink /> {t("openPublicPage")}
            </Link>
          </Button>
        }
      />

      <div className={KPI_GRID}>
        <KpiCard icon={Heart} label={t("eventInterested")} value={formatNumber(event.interestedCount, language)} hints={[]} />
        <KpiCard icon={UserCheck} label={t("eventRegistration")} value={t(event.registrationOpen ? "regOpen" : "regClosed")} hints={[date(event.deadlineAt)]} />
        <KpiCard icon={CalendarClock} label={t("fieldStarts")} value={formatDate(event.startsAt, language)} hints={[]} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListCard title={t("eventInfo")} empty="" emptyIcon={Trophy} isEmpty={false}>
          <FieldList
            fields={[
              { label: t("fieldOrganizer"), value: event.organizer },
              { label: t("fieldStarts"), value: date(event.startsAt) },
              { label: t("fieldDeadline"), value: date(event.deadlineAt) },
              { label: t("fieldFormat"), value: event.format },
              { label: t("fieldTeamSize"), value: event.teamSize },
              { label: t("fieldPrize"), value: event.prize },
              {
                label: t("fieldLink"),
                value: event.registrationUrl && (
                  <a href={event.registrationUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {event.registrationUrl}
                  </a>
                ),
              },
              { label: t("fieldRules"), value: event.rules && <span className="whitespace-pre-line">{event.rules}</span> },
            ]}
          />
        </ListCard>

        <ListCard
          title={t("eventInterests")}
          empty={t("noInterests")}
          emptyIcon={Heart}
          isEmpty={interests.length === 0}
          note={interests.length >= listLimit ? t("latestOnly", { count: listLimit }) : null}
        >
          <ul className="flex flex-col gap-2">
            {interests.map((interest) => (
              <li key={interest.user.id} className="flex items-center gap-2 text-sm">
                <PersonLink person={interest.user} />
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatDate(interest.createdAt, language)}</span>
              </li>
            ))}
          </ul>
        </ListCard>
      </div>
    </>
  );
}
