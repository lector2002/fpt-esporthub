"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, GraduationCap, MessageSquareText, PauseCircle, Pencil, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GameBadge, ReputationBadge, VerificationBadge } from "@/components/common/badges";
import { playerArtUrl, SplashBanner } from "@/components/common/champion-splash";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { RankEmblem } from "@/components/common/rank-emblem";
import { UserAvatar } from "@/components/common/user-avatar";
import { CosmeticBanner, CosmeticFrame, CosmeticTitle, cardLookClass, nameColorClass } from "@/features/cosmetics/components/cosmetic-parts";
import { useWallet } from "@/features/credits/api";
import { AchievementsCard } from "@/features/media/components/achievement-gallery";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useCoach, useCreateCoachingRequest } from "../api";
import { formatShortDate, formatVnd } from "../format";
import { useCoachingMessages } from "../messages";
import type { CoachDetail as CoachDetailData, CoachReview, CoachSummary } from "../types";
import { coachRankLine } from "./coach-card";
import { ProposalDialog } from "./proposal-dialog";
import { RatingStars } from "./rating-stars";
import { ReviewForm } from "./review-form";

function DetailSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-64 lg:col-span-2" />
      <Skeleton className="h-64" />
    </div>
  );
}

function ChipSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase">{title}</h3>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function CoachStats({ coach }: { coach: CoachSummary }) {
  const { t } = useCoachingMessages();
  const stats = [
    { icon: Star, label: t("statRating"), value: coach.avgRating === null ? "-" : coach.avgRating.toFixed(1) },
    { icon: MessageSquareText, label: t("statReviews"), value: coach.reviewCount },
    { icon: GraduationCap, label: t("statSessions"), value: coach.completedSessions },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <stat.icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{stat.label}</span>
          </dt>
          <dd className="text-lg font-semibold tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Uploaded cover first, then a bought banner, then the coach's champion or agent art. */
function CoachBanner({ coach }: { coach: CoachSummary }) {
  if (coach.coverKey) return <SplashBanner src={mediaUrl(coach.coverKey)} className="h-32 sm:h-40" />;
  if (coach.cosmetics.banner) return <CosmeticBanner banner={coach.cosmetics.banner} className="h-32 sm:h-40" />;
  return <SplashBanner src={playerArtUrl(coach.game, coach, coach.userId)} className="h-32 sm:h-40" />;
}

function CoachHeader({ coach }: { coach: CoachSummary }) {
  const { t } = useCoachingMessages();
  return (
    <Card className={cn("overflow-hidden pt-0", cardLookClass(coach.cosmetics.card))}>
      <CoachBanner coach={coach} />
      <CardContent className="relative -mt-12 flex flex-col gap-5">
        <div className="flex items-end gap-4">
          <CosmeticFrame frame={coach.cosmetics.frame} pet={coach.cosmetics.pet}>
            <UserAvatar name={coach.displayName} imageKey={coach.avatarKey} className="size-20 text-2xl ring-4 ring-card" />
          </CosmeticFrame>
          <div className="flex min-w-0 flex-col gap-1 pb-1">
            <h1 className={cn("truncate text-2xl font-semibold tracking-tight", nameColorClass(coach.cosmetics.nameColor))}>{coach.displayName}</h1>
            <CosmeticTitle title={coach.cosmetics.title} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <GameBadge game={coach.game} />
            <ReputationBadge badge={coach.reputationBadge} />
            <VerificationBadge status={coach.verificationStatus} />
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <RankEmblem game={coach.game} tier={coach.rankTier} level={coach.rankLevel} className="size-7" />
            {coachRankLine(coach)}
          </p>
        </div>
        <CoachStats coach={coach} />
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase">{t("about")}</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{coach.bio}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingCard({ data }: { data: CoachDetailData }) {
  const { t } = useCoachingMessages();
  const router = useRouter();
  const { coach, viewerIsCoach } = data;
  const [open, setOpen] = useState(false);
  const createRequest = useCreateCoachingRequest();
  const inCredits = useWallet().data?.coachingInCredits;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-2xl font-semibold text-primary">{t("perHour", { amount: formatVnd(coach.hourlyRate) })}</p>
        {viewerIsCoach ? (
          <Button asChild variant="outline">
            <Link href="/coaches/me">
              <Pencil /> {t("editListing")}
            </Link>
          </Button>
        ) : coach.active ? (
          <Button onClick={() => setOpen(true)}>
            <Send /> {t("requestSession")}
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PauseCircle className="size-4" /> {t("paused")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{viewerIsCoach ? t("ownListing") : t(inCredits ? "paymentNoteCredits" : "paymentNote")}</p>
        <ChipSection title={t("specialties")} items={coach.specialties} />
        <ChipSection title={t("availability")} items={coach.availability} />
      </CardContent>
      <ProposalDialog
        open={open}
        onOpenChange={setOpen}
        title={t("requestTitle", { name: coach.displayName })}
        submitLabel={t("sendRequest")}
        hourlyRate={coach.hourlyRate}
        payer
        pending={createRequest.isPending}
        onSubmit={(input) =>
          createRequest.mutate(
            { coachId: coach.id, ...input },
            {
              onSuccess: () => {
                setOpen(false);
                toast.success(t("requestSent"), { action: { label: t("mySessions"), onClick: () => router.push("/coaches/sessions") } });
              },
              onError: (error) => toast.error(error.message),
            },
          )
        }
      />
    </Card>
  );
}

function ReviewItem({ review }: { review: CoachReview }) {
  const { language } = useCoachingMessages();
  return (
    <li className="flex gap-3 py-3">
      <UserAvatar name={review.player.displayName} className="size-8" />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{review.player.displayName}</span>
          <RatingStars value={review.rating} />
          <span className="text-xs text-muted-foreground">{formatShortDate(review.createdAt, language)}</span>
        </div>
        <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{review.comment}</p>
      </div>
    </li>
  );
}

function ReviewsCard({ data }: { data: CoachDetailData }) {
  const { t } = useCoachingMessages();
  return (
    <div className="flex flex-col gap-4">
      {data.viewerCanReview && <ReviewForm coachId={data.coach.id} />}
      <Card>
        <CardHeader>
          <CardTitle>{t("reviews")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.reviews.length === 0 ? (
            <EmptyState icon={MessageSquareText} title={t("noReviewsYet")} />
          ) : (
            <ul className="divide-y divide-border">
              {data.reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CoachDetail({ id }: { id: string }) {
  const { t } = useCoachingMessages();
  const coach = useCoach(id);
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/coaches">
          <ChevronLeft /> {t("allCoaches")}
        </Link>
      </Button>
      <QueryState query={coach} skeleton={<DetailSkeleton />}>
        {(data) => (
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CoachHeader coach={data.coach} />
            </div>
            <div className="lg:sticky lg:top-20 lg:row-span-2">
              <BookingCard data={data} />
            </div>
            <div className="flex flex-col gap-4 lg:col-span-2">
              <AchievementsCard achievements={data.achievements} owner={{ owner: "coach" }} canEdit={data.viewerIsCoach} />
              <ReviewsCard data={data} />
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}
