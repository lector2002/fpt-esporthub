"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserX } from "lucide-react";
import { AramBadge, GameBadge, ReputationBadge, VerificationBadge } from "@/components/common/badges";
import { playerArtUrl } from "@/components/common/champion-splash";
import { EmptyState, ListSkeleton, QueryState } from "@/components/common/query-state";
import { RankEmblem } from "@/components/common/rank-emblem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { avatarPaths } from "@/features/media/api";
import { AchievementsCard } from "@/features/media/components/achievement-gallery";
import { CosmeticBanner, CosmeticFrame, CosmeticTitle, nameColorClass } from "@/features/cosmetics/components/cosmetic-parts";
import { CoverEditor, PictureEditor } from "@/features/media/components/picture-editor";
import { SendRequestButton } from "@/features/requests/components/send-request-button";
import { PlaystyleSummary } from "@/features/questionnaire/components/playstyle-summary";
import { GameStatsCard } from "@/features/riot/components/game-stats-card";
import { SafetyMenu } from "@/features/safety/components/safety-menu";
import { ApiError } from "@/lib/api-client";
import { GAMES, formatRank, isAramOnly, type GameSlug } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { usePublicProfile } from "../api";
import { cn } from "@/lib/utils";
import { useOptionLabel, useProfileMessages } from "../messages";
import type { PublicGameProfile, PublicProfileResponse } from "../types";

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="secondary">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function PublicGameCard({ profile, campus }: { profile: PublicGameProfile; campus: string | null }) {
  const { t } = useProfileMessages();
  const optionLabel = useOptionLabel();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GameBadge game={profile.game} /> {GAMES[profile.game].label}
        </CardTitle>
        <CardAction className="flex flex-wrap justify-end gap-1.5">
          {profile.playModes.includes("aram") && <AramBadge />}
          <VerificationBadge status={profile.verificationStatus} />
          {profile.lookingStatus === "open_to_match" && (
            <Badge variant="outline" className="text-primary">
              {t("looking")}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className={profile.bio ? "text-sm" : "text-sm text-muted-foreground"}>{profile.bio ?? t("noBio")}</p>
        <dl className="grid gap-4 sm:grid-cols-2">
          {!isAramOnly(profile.playModes) && (
            <>
              <Detail label={t("rank")}>
                <span className="flex items-center gap-1.5">
                  <RankEmblem game={profile.game} tier={profile.rankTier} level={profile.rankLevel} />
                  {formatRank(profile)}
                </span>
              </Detail>
              <Detail label={t("role")}>{profile.role}</Detail>
            </>
          )}
          {profile.riotId && <Detail label={t("riotId")}>{profile.riotId}</Detail>}
          {profile.schedule.length > 0 && (
            <Detail label={t("schedule")}>
              <ChipList items={profile.schedule.map((id) => optionLabel("schedule", id))} />
            </Detail>
          )}
          {profile.goals.length > 0 && (
            <Detail label={t("goals")}>
              <ChipList items={profile.goals.map((id) => optionLabel("goal", id))} />
            </Detail>
          )}
          {profile.communicationStyles.length > 0 && (
            <Detail label={t("styles")}>
              <ChipList items={profile.communicationStyles.map((id) => optionLabel("style", id))} />
            </Detail>
          )}
        </dl>
        <PlaystyleSummary
          game={profile.game}
          answers={{ voiceChat: profile.voiceChat, lossReaction: profile.lossReaction, mains: profile.mains, ageRange: null, campus }}
          owner={false}
        />
      </CardContent>
    </Card>
  );
}

function PublicProfile({ data, viewerGame }: { data: PublicProfileResponse; viewerGame: GameSlug | null }) {
  const { t, language } = useProfileMessages();
  const { user } = useSession();
  const shared = data.profiles.some((profile) => profile.game === viewerGame);
  const cosmetics = data.user.cosmetics;
  // The viewer's active game first, then the rest in creation order.
  const profiles = [...data.profiles].sort((a, b) => Number(b.game === viewerGame) - Number(a.game === viewerGame));
  // Uploaded cover first, then a bought banner, then champion or agent art for the first game shown.
  const first = profiles[0];
  const art = first ? playerArtUrl(first.game, first, data.user.id) : null;
  const banner = data.user.coverKey ? null : cosmetics.banner;
  const joined = new Date(data.user.createdAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden pt-0">
        {banner ? (
          <CosmeticBanner banner={banner} className="h-32 sm:h-40" />
        ) : (
          <CoverEditor imageKey={data.user.coverKey} fallback={art} paths={avatarPaths(data.user.id, user, "cover")} className="h-32 sm:h-40" />
        )}
        <CardContent className="relative -mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <CosmeticFrame frame={cosmetics.frame}>
              <PictureEditor
                name={data.user.displayName}
                imageKey={data.user.avatarKey}
                paths={avatarPaths(data.user.id, user)}
                className="size-20 text-2xl ring-4 ring-card"
              />
            </CosmeticFrame>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className={cn("truncate text-2xl font-semibold tracking-tight", nameColorClass(cosmetics.nameColor))}>{data.user.displayName}</h1>
              <CosmeticTitle title={cosmetics.title} />
              <div className="flex flex-wrap items-center gap-2">
                <ReputationBadge badge={data.user.reputationBadge} />
                <span className="text-xs text-muted-foreground">{t("memberSince", { date: joined })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {shared && <SendRequestButton targetType="player" targetId={data.user.id} targetName={data.user.displayName} />}
            <SafetyMenu
              targetType="user"
              targetId={data.user.id}
              targetName={data.user.displayName}
              owner={{ id: data.user.id, name: data.user.displayName }}
            />
          </div>
        </CardContent>
      </Card>
      <AchievementsCard achievements={data.achievements} owner={{ owner: "user" }} canEdit={user?.id === data.user.id} />
      <div className="grid gap-6 lg:grid-cols-2">
        {profiles.map((profile) => (
          <PublicGameCard key={profile.id} profile={profile} campus={data.user.campus} />
        ))}
      </div>
      {data.profiles.some((profile) => profile.game === "league_of_legends") && (
        <GameStatsCard game="league_of_legends" userId={data.user.id} />
      )}
    </div>
  );
}

function NotFound() {
  const { t } = useProfileMessages();
  return (
    <EmptyState
      icon={UserX}
      title={t("playerNotFound")}
      description={t("playerNotFoundDesc")}
      action={
        <Button asChild>
          <Link href="/find-match">
            <Search /> {t("goFindMatch")}
          </Link>
        </Button>
      }
    />
  );
}

export function PublicProfileScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const { user } = useSession();
  const { game } = useActiveGame();
  const isSelf = user?.id === userId;
  const query = usePublicProfile(userId, Boolean(user) && !isSelf);

  useEffect(() => {
    if (isSelf) router.replace("/profile/me");
  }, [isSelf, router]);

  if (!user || isSelf) return <ListSkeleton rows={2} />;
  if (query.error instanceof ApiError && query.error.status === 404) return <NotFound />;

  return (
    <QueryState query={query} skeleton={<ListSkeleton rows={2} />}>
      {(data) => <PublicProfile data={data} viewerGame={game} />}
    </QueryState>
  );
}
