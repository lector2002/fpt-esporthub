"use client";

import Link from "next/link";
import { Coins, Medal, Monitor, Store, Users } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { TournamentStatusBadge } from "@/features/offline-tournaments/components/status-badge";
import { formatVnd } from "@/features/offline-tournaments/format";
import { useOfflineMessages } from "@/features/offline-tournaments/messages";
import { useAdminVenue } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import type { AdminVenueDetail } from "../detail-types";
import { formatDate, formatNumber } from "../format";
import { AdminDetail } from "./admin-detail";
import { DetailHeader, FieldList, KPI_GRID, ListCard, PersonLink } from "./detail-parts";
import { KpiCard } from "./finance-cards";

export function VenueDetail({ id }: { id: string }) {
  const { t } = useAdminDetailMessages();
  return (
    <AdminDetail query={useAdminVenue(id)} backHref="/admin/venues" backLabel={t("backToVenues")} notFound={{ icon: Store, title: t("venueNotFound") }}>
      {(data) => <VenueDetailBody data={data} />}
    </AdminDetail>
  );
}

function VenueDetailBody({ data }: { data: AdminVenueDetail }) {
  const { t, language } = useAdminDetailMessages();
  const offline = useOfflineMessages().t;
  const { venue, cups, totals, listLimit } = data;
  const number = (value: number) => formatNumber(value, language);

  return (
    <>
      <DetailHeader
        avatar={
          <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="size-7" aria-hidden />
          </span>
        }
        title={venue.name}
        badges={<Badge variant="outline">{offline(`venue_${venue.status}`)}</Badge>}
        lines={[
          `${venue.address}, ${venue.city}`,
          <>
            {t("cupHost")}: <PersonLink person={venue.owner} />
          </>,
        ]}
      />

      <div className={KPI_GRID}>
        <KpiCard icon={Medal} label={t("venueCups")} value={number(totals.cups)} hints={[]} />
        <KpiCard icon={Users} label={t("venueEntries")} value={number(totals.entries)} hints={[]} />
        <KpiCard icon={Coins} label={t("cupFees")} value={formatVnd(totals.feesCollected, language)} hints={[]} />
        <KpiCard icon={Monitor} label={t("venuePcs")} value={number(venue.pcCount)} hints={[]} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListCard title={t("venueInfo")} empty="" emptyIcon={Store} isEmpty={false}>
          <FieldList
            fields={[
              { label: t("fieldAddress"), value: `${venue.address}, ${venue.city}` },
              { label: t("fieldPhone"), value: venue.phone },
              { label: t("fieldEmail"), value: venue.owner.email },
              { label: t("fieldApplied"), value: formatDate(venue.createdAt, language) },
              { label: t("fieldReviewed"), value: venue.reviewedAt && formatDate(venue.reviewedAt, language) },
              { label: t("fieldReviewNote"), value: venue.reviewNote },
            ]}
          />
        </ListCard>

        <ListCard
          title={t("venueCups")}
          empty={t("noCupsYet")}
          emptyIcon={Medal}
          isEmpty={cups.length === 0}
          note={totals.cups > listLimit ? t("latestOnly", { count: listLimit }) : null}
        >
          <ul className="flex flex-col gap-3">
            {cups.map((cup) => (
              <li key={cup.id} className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/cups/${cup.id}`} className="font-medium hover:underline">
                    {cup.title}
                  </Link>
                  <GameBadge game={cup.game} />
                  <TournamentStatusBadge status={cup.status} />
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(cup.startsAt, language)} · {t("venueCupTeams", { count: cup.entries, max: cup.maxTeams })}
                  {cup.entryFee > 0 && ` · ${t("venueCupPaid", { count: cup.paidEntries })}`}
                </p>
              </li>
            ))}
          </ul>
        </ListCard>
      </div>
    </>
  );
}
