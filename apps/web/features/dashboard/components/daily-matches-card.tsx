"use client";

import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import { ReputationBadge } from "@/components/common/badges";
import { ABOVE_CARD_LINK, CardLink } from "@/components/common/card-link";
import { EmptyState } from "@/components/common/query-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/features/matching/components/score-badge";
import { reasonLabel, useMatchingMessages } from "@/features/matching/messages";
import { SendRequestButton } from "@/features/requests/components/send-request-button";
import { cn } from "@/lib/utils";
import { useDashboardMessages } from "../messages";
import type { DailyMatch } from "../types";

/** `aram`: the matches were scored for ARAM, where rank and role don't apply. */
function MatchRow({ match, aram }: { match: DailyMatch; aram: boolean }) {
  const { t: tMatching } = useMatchingMessages();
  return (
    <li className="relative -mx-2 flex cursor-pointer flex-col gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center">
      <CardLink href={`/players/${match.id}`} />
      <Link
        href={`/players/${match.id}`}
        className="group flex min-w-0 flex-1 items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserAvatar name={match.displayName} imageKey={match.avatarKey} />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium group-hover:underline">{match.displayName}</span>
            <ReputationBadge badge={match.reputationBadge} />
          </div>
          {!aram && (
            <p className="text-sm text-muted-foreground">
              {match.rank} · {match.role}
            </p>
          )}
          {match.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.reasons.map((reason) => (
                <Badge key={reason} variant="secondary">
                  {reasonLabel(tMatching, reason)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className={cn("flex items-center justify-between gap-3 sm:flex-col sm:items-end", ABOVE_CARD_LINK)}>
        <ScoreBadge score={match.score} inline />
        <SendRequestButton targetType="player" targetId={match.id} targetName={match.displayName} variant="outline" />
      </div>
    </li>
  );
}

export function DailyMatchesCard({ matches, aram = false }: { matches: DailyMatch[]; aram?: boolean }) {
  const { t } = useDashboardMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("todayMatches")}
          {matches.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {matches.length}
            </Badge>
          )}
        </CardTitle>
        {matches.length > 0 && (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/find-match">
                {t("seeAll")} <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <EmptyState
            icon={Users}
            image={"/images/empty-search.webp"}
            title={t("noMatches")}
            description={t("noMatchesDesc")}
            action={
              <Button asChild>
                <Link href="/find-match">
                  <Search /> {t("findMatch")}
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {matches.map((match) => (
              <MatchRow key={match.id} match={match} aram={aram} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
