"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ReputationBadge } from "@/components/common/badges";
import { CARD_HOVER, CardLink } from "@/components/common/card-link";
import { playerArtUrl, SplashBanner } from "@/components/common/champion-splash";
import { RankEmblem } from "@/components/common/rank-emblem";
import { UserAvatar } from "@/components/common/user-avatar";
import { CosmeticBanner, CosmeticFrame, cardLookClass, nameColorClass } from "@/features/cosmetics/components/cosmetic-parts";
import { formatRank } from "@/lib/contracts";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { formatVnd } from "../format";
import { useCoachingMessages } from "../messages";
import type { CoachSummary } from "../types";
import { RatingSummary } from "./rating-stars";

const AVAILABILITY_PREVIEW = 2;

export function coachRankLine(coach: Pick<CoachSummary, "rankTier" | "rankLevel" | "role">) {
  const rank = coach.rankTier ? formatRank({ rankTier: coach.rankTier, rankLevel: coach.rankLevel }) : null;
  return [rank, coach.role].filter(Boolean).join(" · ");
}

export function CoachCard({ coach }: { coach: CoachSummary }) {
  const { t } = useCoachingMessages();
  const extraSlots = coach.availability.length - AVAILABILITY_PREVIEW;
  return (
    <Card size="sm" className={cn("h-full pt-0", CARD_HOVER, cardLookClass(coach.cosmetics.card))}>
      <CardLink href={`/coaches/${coach.id}`} />
      {coach.coverKey ? (
        <SplashBanner src={mediaUrl(coach.coverKey)} className="h-16" />
      ) : coach.cosmetics.banner ? (
        <CosmeticBanner banner={coach.cosmetics.banner} className="h-16" />
      ) : (
        <SplashBanner src={playerArtUrl(coach.game, coach, coach.userId)} className="h-16" />
      )}
      <CardContent className="relative -mt-9 flex flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <CosmeticFrame frame={coach.cosmetics.frame} pet={coach.cosmetics.pet}>
            <UserAvatar name={coach.displayName} imageKey={coach.avatarKey} className="size-12 ring-4 ring-card" />
          </CosmeticFrame>
          <div className="min-w-0 flex-1 pt-7">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/coaches/${coach.id}`} className={cn("truncate font-semibold hover:underline", nameColorClass(coach.cosmetics.nameColor))}>
                {coach.displayName}
              </Link>
              <ReputationBadge badge={coach.reputationBadge} />
            </div>
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <RankEmblem game={coach.game} tier={coach.rankTier} level={coach.rankLevel} className="size-5" />
              <span className="truncate">{coachRankLine(coach)}</span>
            </p>
            <RatingSummary avgRating={coach.avgRating} reviewCount={coach.reviewCount} />
          </div>
          <div className="shrink-0 pt-7 text-right">
            <p className="font-semibold text-primary">{formatVnd(coach.hourlyRate)}</p>
            <p className="text-xs text-muted-foreground">{t("hourUnit")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {coach.specialties.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
        {coach.availability.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" />
            <span className="truncate">
              {coach.availability.slice(0, AVAILABILITY_PREVIEW).join(", ")}
              {extraSlots > 0 && ` ${t("moreItems", { count: extraSlots })}`}
            </span>
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-between py-2">
        <span className="text-xs text-muted-foreground">{t("sessionsDone", { count: coach.completedSessions })}</span>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/coaches/${coach.id}`}>
            {t("viewProfile")} <ChevronRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
