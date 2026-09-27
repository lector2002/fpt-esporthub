"use client";

import Link from "next/link";
import { Search, UserPen } from "lucide-react";
import { AramBadge, GameBadge, ReputationBadge, VerificationBadge } from "@/components/common/badges";
import { playerArtUrl, SplashBanner } from "@/components/common/champion-splash";
import { RankEmblem } from "@/components/common/rank-emblem";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LookingToggle } from "@/features/profile/components/looking-toggle";
import { gameSlug, isAramOnly, type GameSlug } from "@/lib/contracts";
import { mediaUrl } from "@/lib/media";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useDashboardMessages } from "../messages";
import type { DashboardView } from "../types";

type ActiveProfile = NonNullable<DashboardView["profile"]>;

/** Who you are for the active game, plus the one thing to do next: find teammates. */
export function IdentityHeader({ view, game, profile }: { view: DashboardView; game: GameSlug; profile: ActiveProfile }) {
  const { t } = useDashboardMessages();
  const { user, profiles } = useSession();
  const own = profiles.find((item) => gameSlug(item.game) === game);
  const art = mediaUrl(user?.coverKey) ?? playerArtUrl(game, own ?? { mains: [] }, user?.id ?? "");

  return (
    <Card className={cn(art && "overflow-hidden pt-0")}>
      {art && <SplashBanner src={art} className="h-24" />}
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar name={view.displayName} imageKey={user?.avatarKey} className="size-14 text-lg" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{view.displayName}</h1>
              <GameBadge game={game} />
              {profile.playModes.includes("aram") && <AramBadge />}
            </div>
            {!isAramOnly(profile.playModes) && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <RankEmblem game={game} tier={own?.rankTier} level={own?.rankLevel} className="size-7" />
                {profile.rank} · {profile.role}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              <ReputationBadge badge={view.reputationBadge} />
              <VerificationBadge status={profile.verificationStatus} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <LookingToggle id="dashboard-looking" game={game} lookingStatus={profile.lookingStatus} />
          <div className="flex flex-1 gap-2 sm:flex-none">
            <Button asChild variant="ghost">
              <Link href="/profile/me">
                <UserPen /> {t("editProfile")}
              </Link>
            </Button>
            <Button asChild className="flex-1 sm:flex-none">
              <Link href="/find-match">
                <Search /> {t("findMatch")}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
