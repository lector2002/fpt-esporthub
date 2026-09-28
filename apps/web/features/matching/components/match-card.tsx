"use client";

import Link from "next/link";
import { Clock, Crown, MessageSquare, Reply, Users } from "lucide-react";
import { ReputationBadge, VerificationBadge } from "@/components/common/badges";
import { ABOVE_CARD_LINK, CARD_HOVER, CardLink } from "@/components/common/card-link";
import { playerArtUrl, SplashBanner } from "@/components/common/champion-splash";
import { RankEmblem } from "@/components/common/rank-emblem";
import { UserAvatar } from "@/components/common/user-avatar";
import { CardDecoration, CosmeticBanner, CosmeticFrame, CosmeticTitle, cardLookClass, nameColorClass } from "@/features/cosmetics/components/cosmetic-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRank } from "@/lib/contracts";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { SendRequestButton } from "@/features/requests/components/send-request-button";
import { inboxChatHref, INBOX_REQUESTS_HREF } from "@/features/requests/api";
import { reasonLabel, slotLabel, useMatchingMessages } from "../messages";
import type { MatchResult, PlayerMatch, TeamMatch } from "../types";
import { ScoreBadge } from "./score-badge";

const MAX_REASONS = 2;

/** `aram` hides rank and role fit: ARAM results are scored on schedule, goals and style only. The name is the profile link. */
export function MatchCard({ match, aram = false }: { match: MatchResult; aram?: boolean }) {
  const { t } = useMatchingMessages();
  const name = match.type === "player" ? match.displayName : match.name;
  const href = match.type === "player" ? `/players/${match.id}` : `/teams/${match.id}`;
  const blurb = match.type === "player" ? match.bio : match.description;

  return (
    <Card className={cn("flex flex-col gap-3 p-4 pt-0", CARD_HOVER, match.type === "player" && cardLookClass(match.cosmetics.card))}>
      <CardLink href={href} />
      {match.type === "player" && <CardDecoration card={match.cosmetics.card} width={20} />}
      <CardBanner match={match} />
      <div className="relative -mt-9 flex items-start gap-3">
        <CosmeticFrame frame={match.type === "player" ? match.cosmetics.frame : null} pet={match.type === "player" ? match.cosmetics.pet : null}>
          <UserAvatar name={name} imageKey={match.type === "player" ? match.avatarKey : match.logoKey} kind={match.type === "player" ? "player" : "team"} className="size-14 ring-4 ring-card" />
        </CosmeticFrame>
        <div className="min-w-0 flex-1 pt-10">
          <Link href={href} className={cn("block truncate font-semibold hover:underline", match.type === "player" && nameColorClass(match.cosmetics.nameColor))}>
            {name}
          </Link>
          {match.type === "player" && <CosmeticTitle title={match.cosmetics.title} />}
          {match.type === "player" ? <PlayerMeta match={match} aram={aram} /> : <TeamMeta match={match} aram={aram} />}
        </div>
        {match.type === "player" && !aram && <RankEmblem game={match.game} tier={match.rankTier} level={match.rankLevel} className="mt-10 size-12" />}
      </div>

      {match.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {match.reasons.slice(0, MAX_REASONS).map((reason) => (
            <Badge key={reason} variant="secondary">
              {reasonLabel(t, reason)}
            </Badge>
          ))}
          {match.reasons.length > MAX_REASONS && (
            <Badge variant="secondary" className="tabular-nums" title={match.reasons.slice(MAX_REASONS).map((reason) => reasonLabel(t, reason)).join(", ")}>
              +{match.reasons.length - MAX_REASONS}
            </Badge>
          )}
        </div>
      )}

      {match.schedule.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {match.schedule.map((slot) => (
            <Badge key={slot} variant="outline" className="text-muted-foreground">
              <Clock /> {slotLabel(t, slot)}
            </Badge>
          ))}
        </div>
      )}

      {blurb && <p className="line-clamp-2 text-sm text-muted-foreground">{blurb}</p>}

      <div className={cn("mt-auto flex items-center justify-end pt-1", ABOVE_CARD_LINK)}>
        <MatchAction match={match} name={name} />
      </div>
    </Card>
  );
}

/** Equipped cosmetic banner, else the player's main (splash or agent art); teams get their game's art. Score on top. */
function CardBanner({ match }: { match: MatchResult }) {
  const player = match.type === "player" ? match : null;
  const fallback = player ? playerArtUrl(player.game, player, player.id) : `/images/event-${match.game}.webp`;
  return (
    <div className="relative -mx-4">
      {match.coverKey ? (
        <SplashBanner src={mediaUrl(match.coverKey)} className="h-20" />
      ) : player?.cosmetics.banner ? (
        <CosmeticBanner banner={player.cosmetics.banner} className="h-20" />
      ) : (
        <SplashBanner src={fallback} className="h-20" />
      )}
      <ScoreBadge score={match.score} className="absolute top-2 right-2 rounded-lg bg-card px-2 py-1 shadow-md ring-1 ring-foreground/10" />
    </div>
  );
}

function PlayerMeta({ match, aram }: { match: PlayerMatch; aram: boolean }) {
  return (
    <>
      {!aram && (
        <p className="truncate text-sm text-muted-foreground">
          {formatRank(match)} · {match.role}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
        <ReputationBadge badge={match.reputationBadge} />
        <VerificationBadge status={match.verificationStatus} />
      </div>
    </>
  );
}

function TeamMeta({ match, aram }: { match: TeamMatch; aram: boolean }) {
  const { t } = useMatchingMessages();
  const rankRange = match.rankMin === match.rankMax ? match.rankMin : `${match.rankMin} - ${match.rankMax}`;
  return (
    <>
      {!aram && (
        <p className="truncate text-sm text-muted-foreground">
          {rankRange}
          {match.neededRoles.length > 0 && ` · ${t("needs")} ${match.neededRoles.join(", ")}`}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" /> {t("members", { count: match.memberCount, max: match.maxMembers })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Crown className="size-3.5" /> {t("captain", { name: match.captainName })}
        </span>
      </div>
    </>
  );
}

function MatchAction({ match, name }: { match: MatchResult; name: string }) {
  const { t } = useMatchingMessages();
  switch (match.requestStatus) {
    case "connected":
      return (
        <Button asChild size="sm" variant="secondary">
          <Link href={inboxChatHref(match.conversationId)}>
            <MessageSquare /> {t("openChat")}
          </Link>
        </Button>
      );
    case "pending_received":
      return (
        <Button asChild size="sm">
          <Link href={INBOX_REQUESTS_HREF}>
            <Reply /> {t("respond")}
          </Link>
        </Button>
      );
    case "pending_sent":
      return (
        <Button size="sm" variant="outline" disabled>
          <Clock /> {t("requested")}
        </Button>
      );
    default:
      return <SendRequestButton targetType={match.type} targetId={match.id} targetName={name} variant="outline" className="h-7" />;
  }
}
