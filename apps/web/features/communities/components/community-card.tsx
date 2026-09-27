"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Loader2, LogIn, Users, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { GameBadge } from "@/components/common/badges";
import { ABOVE_CARD_LINK, CARD_HOVER, CardLink } from "@/components/common/card-link";
import { SplashBanner } from "@/components/common/champion-splash";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { communityHref, useJoinCommunity } from "../api";
import { useCommunityMessages } from "../messages";
import type { CommunitySummary } from "../types";

/** Uploaded banner, else the game's art, else the generic lounge picture. */
export const communityArt = (community: Pick<CommunitySummary, "coverKey" | "game">) =>
  mediaUrl(community.coverKey) ?? (community.game ? `/images/event-${community.game}.webp` : "/images/community-cover.webp");

/** Round community icon: uploaded picture or a generated one. */
export function CommunityIcon({ community, className }: { community: Pick<CommunitySummary, "name" | "iconKey">; className?: string }) {
  return <UserAvatar name={community.name} imageKey={community.iconKey} kind="team" className={className} />;
}

export function CommunityGameBadge({ game }: { game: CommunitySummary["game"] }) {
  const { t } = useCommunityMessages();
  return game ? <GameBadge game={game} /> : <Badge variant="outline">{t("anyGame")}</Badge>;
}

/** Green "n in voice" pill, like Discord's live voice indicator. */
export function InVoiceBadge({ count }: { count: number }) {
  const { t } = useCommunityMessages();
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
      <Volume2 className="size-4" aria-hidden />
      {t("inVoiceCount", { count })}
    </span>
  );
}

export function JoinCommunityButton({ community, className }: { community: CommunitySummary; className?: string }) {
  const { t } = useCommunityMessages();
  const router = useRouter();
  const join = useJoinCommunity();
  return (
    <Button
      size="sm"
      className={className}
      disabled={join.isPending}
      onClick={() =>
        join.mutate(community.id, {
          onSuccess: () => router.push(communityHref(community.id)),
          onError: (error) => toast.error(error.message),
        })
      }
    >
      {join.isPending ? <Loader2 className="animate-spin" /> : <LogIn />} {t("join")}
    </Button>
  );
}

export function CommunityCard({ community }: { community: CommunitySummary }) {
  const { t } = useCommunityMessages();
  const href = communityHref(community.id);

  return (
    <Card size="sm" className={cn("h-full pt-0", CARD_HOVER)} data-testid="community-card">
      <CardLink href={href} />
      <SplashBanner src={communityArt(community)} className="h-20" />
      <CardHeader className="relative -mt-9">
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 items-end gap-2.5">
            <CommunityIcon community={community} className="size-12 ring-4 ring-card" />
            <CardTitle className="min-w-0 truncate">
              <Link href={href} className="hover:text-primary focus-visible:underline">
                {community.name}
              </Link>
            </CardTitle>
          </div>
          <CommunityGameBadge game={community.game} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {community.description && <p className="line-clamp-2 text-sm text-muted-foreground">{community.description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden />
            {t("memberCount", { count: community.memberCount })}
          </span>
          <InVoiceBadge count={community.inVoice} />
        </div>
      </CardContent>
      <CardFooter className={cn("justify-between gap-2 border-t py-3", ABOVE_CARD_LINK)}>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <Crown className="size-4 shrink-0 text-warning" aria-label={t("owner")} />
          <span className="truncate">{community.owner.displayName}</span>
        </span>
        {community.viewerRole ? (
          <Button asChild size="sm" variant="outline">
            <Link href={href}>{t("open")}</Link>
          </Button>
        ) : (
          <JoinCommunityButton community={community} />
        )}
      </CardFooter>
    </Card>
  );
}
