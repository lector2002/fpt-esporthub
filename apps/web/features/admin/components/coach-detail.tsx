"use client";

import Link from "next/link";
import { CalendarCheck, ExternalLink, GraduationCap, ReceiptText, Star, UserRound, Wallet } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCoachingMessages } from "@/features/coaching/messages";
import { formatVnd } from "@/features/offline-tournaments/format";
import { cn } from "@/lib/utils";
import { useAdminCoach } from "../api";
import { useAdminDetailMessages } from "../detail-messages";
import type { AdminCoachDetail } from "../detail-types";
import { formatDate, formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import { AdminDetail } from "./admin-detail";
import { DetailHeader, FieldList, KPI_GRID, ListCard, PersonLink } from "./detail-parts";
import { KpiCard } from "./finance-cards";

export function CoachDetail({ id }: { id: string }) {
  const { t } = useAdminDetailMessages();
  return (
    <AdminDetail query={useAdminCoach(id)} backHref="/admin/coaches" backLabel={t("backToCoaches")} notFound={{ icon: GraduationCap, title: t("coachNotFound") }}>
      {(data) => <CoachDetailBody data={data} />}
    </AdminDetail>
  );
}

function CoachDetailBody({ data }: { data: AdminCoachDetail }) {
  const { t, language } = useAdminDetailMessages();
  const admin = useAdminMessages().t;
  const coaching = useCoachingMessages().t;
  const { coach, stats, listLimit } = data;
  const number = (value: number) => formatNumber(value, language);
  const credits = (count: number) => admin("credits", { count: number(count) });
  const latest = (length: number) => (length >= listLimit ? t("latestOnly", { count: listLimit }) : null);

  return (
    <>
      <DetailHeader
        avatar={<UserAvatar name={coach.user.displayName} imageKey={coach.user.avatarKey} className="size-16 text-xl" />}
        title={coach.user.displayName}
        badges={
          <>
            <GameBadge game={coach.game} />
            <Badge variant="outline">{admin(`coachStatus_${coach.reviewStatus}`)}</Badge>
            {!coach.active && <Badge variant="secondary">{t("coachHidden")}</Badge>}
          </>
        }
        lines={[`${formatVnd(coach.hourlyRate, language)} · ${admin("colCreated")} ${formatDate(coach.createdAt, language)}`]}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/users/${coach.user.id}`}>
                <UserRound /> {t("openAccount")}
              </Link>
            </Button>
            {coach.reviewStatus === "APPROVED" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/coaches/${coach.id}`}>
                  <ExternalLink /> {t("openPublicPage")}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className={KPI_GRID}>
        <KpiCard
          icon={CalendarCheck}
          label={t("coachAgreed")}
          value={number(stats.sessions.AGREED ?? 0)}
          hints={[t("coachAgreedHint", { count: (stats.sessions.PENDING ?? 0) + (stats.sessions.COUNTERED ?? 0) })]}
        />
        <KpiCard
          icon={Wallet}
          label={t("coachPayable")}
          value={credits(coach.payableCredits)}
          tone={coach.payableCredits > 0 ? "text-warning" : undefined}
          hints={[t("coachPayableHint", { earned: number(stats.earned), paid: number(stats.paidOut) })]}
        />
        <KpiCard
          icon={Star}
          label={t("coachRating")}
          value={stats.averageRating === null ? t("none") : stats.averageRating.toFixed(1)}
          hints={[t("coachRatingHint", { count: stats.feedbackCount })]}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ListCard title={t("coachInfo")} empty="" emptyIcon={GraduationCap} isEmpty={false}>
          <FieldList
            fields={[
              { label: t("fieldEmail"), value: coach.user.email },
              { label: t("fieldRate"), value: formatVnd(coach.hourlyRate, language) },
              { label: t("fieldSpecialties"), value: coach.specialties.join(", ") },
              { label: t("fieldAvailability"), value: coach.availability.join(", ") },
              { label: t("fieldBio"), value: coach.bio && <span className="whitespace-pre-line">{coach.bio}</span> },
              { label: t("fieldReviewed"), value: coach.reviewedAt && formatDate(coach.reviewedAt, language) },
              { label: t("fieldReviewNote"), value: coach.reviewNote },
            ]}
          />
        </ListCard>

        <ListCard title={t("coachSessions")} empty={t("noSessions")} emptyIcon={CalendarCheck} isEmpty={coach.requests.length === 0} note={latest(coach.requests.length)}>
          <ul className="flex flex-col gap-3">
            {coach.requests.map((request) => (
              <li key={request.id} className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <PersonLink person={request.player} />
                  <Badge variant="outline">{coaching(`status_${request.status}`)}</Badge>
                  {request.settlement && (
                    <Badge variant="outline" className={request.settlement === "DISPUTED" ? "text-destructive" : undefined}>
                      {coaching(`settlement_${request.settlement}`, { count: request.creditHold ?? 0 })}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t("sessionWhen", { date: formatDate(request.proposedStartAt, language, true), minutes: request.durationMinutes })} · {formatVnd(request.proposedPrice, language)}
                </p>
              </li>
            ))}
          </ul>
        </ListCard>

        <ListCard title={t("coachLedger")} empty={t("noLedger")} emptyIcon={ReceiptText} isEmpty={coach.payouts.length === 0} note={latest(coach.payouts.length)}>
          <ul className="flex flex-col gap-2">
            {coach.payouts.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{t(entry.kind === "EARNING" ? "ledgerEarning" : "ledgerPayout")}</span>
                {entry.kind === "PAYOUT" && entry.note && <span className="min-w-0 truncate text-muted-foreground">{entry.note}</span>}
                <span className={cn("ml-auto tabular-nums", entry.amount > 0 ? "text-success" : "text-muted-foreground")}>
                  {entry.amount > 0 ? "+" : ""}
                  {credits(entry.amount)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{formatDate(entry.createdAt, language)}</span>
              </li>
            ))}
          </ul>
        </ListCard>

        <ListCard title={t("coachFeedback")} empty={t("noFeedback")} emptyIcon={Star} isEmpty={coach.feedbacks.length === 0} note={latest(coach.feedbacks.length)}>
          <ul className="flex flex-col gap-3">
            {coach.feedbacks.map((feedback) => (
              <li key={feedback.id} className="flex flex-col gap-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <PersonLink person={feedback.player} />
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Star className="size-3.5 fill-current text-warning" aria-hidden />
                    {feedback.rating}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">{formatDate(feedback.createdAt, language)}</span>
                </div>
                {feedback.comment && <p className="whitespace-pre-line text-muted-foreground">{feedback.comment}</p>}
              </li>
            ))}
          </ul>
        </ListCard>
      </div>
    </>
  );
}
