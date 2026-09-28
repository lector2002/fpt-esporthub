"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, ShieldCheck, Sparkles, Trophy, UserPlus, UserRound, type LucideIcon } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { playerArtUrl } from "@/components/common/champion-splash";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ListSkeleton, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { avatarPaths } from "@/features/media/api";
import { AchievementGallery } from "@/features/media/components/achievement-gallery";
import { CosmeticBanner, CosmeticFrame, CosmeticTitle, cardLookClass, nameColorClass } from "@/features/cosmetics/components/cosmetic-parts";
import { CosmeticsLocker } from "@/features/cosmetics/components/cosmetics-locker";
import { CoverEditor, PictureEditor } from "@/features/media/components/picture-editor";
import { useMediaMessages } from "@/features/media/messages";
import { RiotConnectPanel } from "@/features/riot/components/riot-connect-card";
import { BlockedUsersList } from "@/features/safety/components/blocked-users-list";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { cn } from "@/lib/utils";
import { useMyProfile } from "../api";
import { useProfileMessages } from "../messages";
import type { MyProfileResponse } from "../types";
import { GameProfileSection } from "./game-profile-form";
import { LookingToggle } from "./looking-toggle";
import { OverviewForm } from "./overview-form";
import { PlaystyleCard } from "./playstyle-card";
import { ProfileDraft } from "./profile-draft";
import { ProfileSection } from "./profile-section";
import { RiotCard, RiotStatusBadge } from "./riot-card";
import { TeamsCard } from "./teams-card";

const TABS = ["profile", "riot", "teams", "decor", "settings"] as const;
type ProfileTab = (typeof TABS)[number];

/** Old section hashes (dashboard links, bookmarks) and the tab each now lives in. */
const HASH_TAB: Record<string, ProfileTab> = {
  overview: "profile",
  game: "profile",
  playstyle: "profile",
  riot: "riot",
  "riot-connect": "riot",
  teams: "teams",
  achievements: "teams",
  cosmetics: "decor",
  settings: "settings",
};

const isTab = (value: string | null): value is ProfileTab => TABS.some((tab) => tab === value);

/** `?tab=` picks the tab; an old `#section` link opens its tab once, then scrolls to the section. */
function useProfileTab() {
  const router = useRouter();
  const params = useSearchParams();
  const fromQuery = params.get("tab");
  const tab: ProfileTab = isTab(fromQuery) ? fromQuery : "profile";

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const target = HASH_TAB[hash];
    if (!target) return;
    if (target !== tab) router.replace(`/profile/me?tab=${target}#${hash}`, { scroll: false });
    else requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
  }, [tab, router]);

  const setTab = (next: string) => router.replace(next === "profile" ? "/profile/me" : `/profile/me?tab=${next}`, { scroll: false });
  return [tab, setTab] as const;
}

/** Cover, avatar and name stay above the tabs so every tab shows whose profile it is. */
function IdentityCard({ user, profile, game }: { user: MyProfileResponse["user"]; profile: NonNullable<MyProfileResponse["profile"]>; game: GameSlug }) {
  const media = useMediaMessages().t;
  return (
    <Card className={cn("overflow-hidden py-0", cardLookClass(user.cosmetics.card))}>
      {user.cosmetics.banner ? (
        <CosmeticBanner banner={user.cosmetics.banner} className="h-28 sm:h-40" />
      ) : (
        <CoverEditor imageKey={user.coverKey} fallback={playerArtUrl(game, profile, user.id)} paths={avatarPaths(user.id, user, "cover")} className="h-28 sm:h-40" />
      )}
      <div className="relative -mt-10 flex flex-wrap items-end gap-x-4 gap-y-2 px-4 pb-4 sm:px-6">
        <CosmeticFrame frame={user.cosmetics.frame} pet={user.cosmetics.pet}>
          <PictureEditor name={user.displayName} imageKey={user.avatarKey} paths={avatarPaths(user.id, user)} className="size-20 text-2xl ring-4 ring-card sm:size-24" />
        </CosmeticFrame>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn("truncate text-xl font-semibold", nameColorClass(user.cosmetics.nameColor))}>{user.displayName}</h2>
            <GameBadge game={game} />
          </div>
          {user.cosmetics.title && <CosmeticTitle title={user.cosmetics.title} />}
          {!user.cosmetics.banner && <p className="text-xs text-muted-foreground">{media("coverHint")}</p>}
        </div>
      </div>
    </Card>
  );
}

function ProfileSections({ data, game }: { data: MyProfileResponse & { profile: NonNullable<MyProfileResponse["profile"]> }; game: GameSlug }) {
  const { t } = useProfileMessages();
  const media = useMediaMessages().t;
  const { user, profile, profileView, achievements } = data;
  const [tab, setTab] = useProfileTab();
  // Remount each form when its saved fields change (or on discard) so its state matches the server.
  const [discards, setDiscards] = useState(0);
  const keys = {
    overview: JSON.stringify([discards, profile.id, user.displayName, profile.bio]),
    game: JSON.stringify([discards, profile.id, profile.rankTier, profile.rankLevel, profile.role, profile.schedule, profile.goals, profile.communicationStyles, profile.playModes]),
    riot: JSON.stringify([discards, profile.id, profile.riotId, profile.verificationStatus]),
  };
  const tabs: { value: ProfileTab; label: string; icon: LucideIcon }[] = [
    { value: "profile", label: t("tabProfile"), icon: UserRound },
    { value: "riot", label: t("tabGameAccount"), icon: ShieldCheck },
    { value: "teams", label: t("tabTeams"), icon: Trophy },
    { value: "decor", label: t("tabDecor"), icon: Sparkles },
    { value: "settings", label: t("sectionSettings"), icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-6">
      <IdentityCard user={user} profile={profile} game={game} />
      <ProfileDraft game={game} onDiscard={() => setDiscards((count) => count + 1)}>
        <Tabs value={tab} onValueChange={setTab} className="gap-6">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList variant="line" aria-label={t("sectionsNav")} className="w-max justify-start">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}>
                  <Icon /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* Every tab stays mounted (hidden when inactive) so unsaved edits survive switching tabs. */}
          <TabsContent value="profile" forceMount className={PANEL}>
            <ProfileSection id="overview" title={t("sectionOverview")}>
              <OverviewForm key={keys.overview} user={user} profile={profile} />
            </ProfileSection>
            <ProfileSection
              id="game"
              title={t("sectionGame", { game: GAMES[game].label })}
              action={<LookingToggle id="profile-looking" game={game} lookingStatus={profile.lookingStatus} />}
            >
              <GameProfileSection key={keys.game} profile={profile} game={game} />
            </ProfileSection>
            <ProfileSection id="playstyle" title={t("sectionPlaystyle")}>
              <PlaystyleCard user={user} profile={profile} game={game} />
            </ProfileSection>
          </TabsContent>
          <TabsContent value="riot" forceMount className={PANEL}>
            <ProfileSection id="riot" title={t("sectionRiot")} action={<RiotStatusBadge profile={profile} />}>
              {/* `#riot-connect` is the dashboard's link target, so it wraps the whole section content. */}
              <div id="riot-connect" className="flex scroll-mt-24 flex-col gap-5">
                {game === "league_of_legends" ? (
                  <RiotConnectPanel game={game} />
                ) : (
                  <>
                    <RiotCard key={keys.riot} profile={profile} />
                    {profile.riotId && (
                      <>
                        <Separator />
                        <RiotConnectPanel game={game} />
                      </>
                    )}
                  </>
                )}
              </div>
            </ProfileSection>
          </TabsContent>
          <TabsContent value="teams" forceMount className={PANEL}>
            <ProfileSection id="teams" title={t("sectionTeams")}>
              <TeamsCard teams={profileView.teams} />
            </ProfileSection>
            <ProfileSection id="achievements" title={media("achievements")}>
              <AchievementGallery achievements={achievements} owner={{ owner: "user" }} canEdit />
            </ProfileSection>
          </TabsContent>
          <TabsContent value="decor" forceMount className={PANEL}>
            <ProfileSection id="cosmetics" title={t("tabDecor")}>
              <CosmeticsLocker name={user.displayName} avatarKey={user.avatarKey} />
            </ProfileSection>
          </TabsContent>
          <TabsContent value="settings" forceMount className={PANEL}>
            <ProfileSection id="settings" title={t("sectionSettings")}>
              <BlockedUsersList />
            </ProfileSection>
          </TabsContent>
        </Tabs>
      </ProfileDraft>
    </div>
  );
}

const PANEL = "flex flex-col gap-6 data-[state=inactive]:hidden";

export function MyProfileScreen() {
  const { t } = useProfileMessages();
  const { game } = useActiveGame();
  const query = useMyProfile(game);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      {game ? (
        <QueryState query={query} skeleton={<ListSkeleton rows={4} />}>
          {(data) =>
            data.profile ? (
              <ProfileSections data={{ ...data, profile: data.profile }} game={game} />
            ) : (
              <EmptyState
                icon={UserPlus}
                title={t("noProfile")}
                action={
                  <Button asChild>
                    <Link href={`/onboarding?game=${game}`}>{t("createProfile")}</Link>
                  </Button>
                }
              />
            )
          }
        </QueryState>
      ) : (
        <ListSkeleton rows={4} />
      )}
    </div>
  );
}
