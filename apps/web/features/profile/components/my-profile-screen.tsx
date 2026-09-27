"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { playerArtUrl } from "@/components/common/champion-splash";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ListSkeleton, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { avatarPaths } from "@/features/media/api";
import { AchievementGallery } from "@/features/media/components/achievement-gallery";
import { CosmeticFrame } from "@/features/cosmetics/components/cosmetic-parts";
import { CosmeticsShop } from "@/features/cosmetics/components/cosmetics-shop";
import { useCosmeticsMessages } from "@/features/cosmetics/messages";
import { CoverEditor, PictureEditor } from "@/features/media/components/picture-editor";
import { useMediaMessages } from "@/features/media/messages";
import { RiotConnectPanel } from "@/features/riot/components/riot-connect-card";
import { BlockedUsersList } from "@/features/safety/components/blocked-users-list";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
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

/** Sections load after the query, so re-apply the URL hash (e.g. `#riot` from the dashboard) once data is in. */
function useScrollToHash(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [ready]);
}

function SectionNav({ sections }: { sections: { id: string; title: string }[] }) {
  const { t } = useProfileMessages();
  return (
    <nav aria-label={t("sectionsNav")} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <Button asChild variant="ghost" size="sm" className="lg:w-full lg:justify-start">
              <a href={`#${section.id}`}>{section.title}</a>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ProfileSections({ data, game }: { data: MyProfileResponse & { profile: NonNullable<MyProfileResponse["profile"]> }; game: GameSlug }) {
  const { t } = useProfileMessages();
  const media = useMediaMessages().t;
  const cosmetics = useCosmeticsMessages().t;
  const { user, profile, profileView, achievements } = data;
  // Remount each form when its saved fields change (or on discard) so its state matches the server.
  const [discards, setDiscards] = useState(0);
  const keys = {
    overview: JSON.stringify([discards, profile.id, user.displayName, profile.bio]),
    game: JSON.stringify([discards, profile.id, profile.rankTier, profile.rankLevel, profile.role, profile.schedule, profile.goals, profile.communicationStyles, profile.playModes]),
    riot: JSON.stringify([discards, profile.id, profile.riotId, profile.verificationStatus]),
  };
  const sections = [
    { id: "overview", title: t("sectionOverview") },
    { id: "game", title: t("sectionGame", { game: GAMES[game].label }) },
    { id: "riot", title: t("sectionRiot") },
    { id: "playstyle", title: t("sectionPlaystyle") },
    { id: "teams", title: t("sectionTeams") },
    { id: "achievements", title: media("achievements") },
    { id: "cosmetics", title: cosmetics("section") },
    { id: "settings", title: t("sectionSettings") },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[12rem_1fr]">
      <SectionNav sections={sections} />
      <div className="flex min-w-0 flex-col gap-6">
        <ProfileDraft game={game} onDiscard={() => setDiscards((count) => count + 1)}>
          <ProfileSection id="overview" title={sections[0].title}>
            <div className="flex flex-col gap-5">
              <div>
                <CoverEditor
                  imageKey={user.coverKey}
                  fallback={playerArtUrl(game, profile, user.id)}
                  paths={avatarPaths(user.id, user, "cover")}
                  className="h-28 rounded-xl sm:h-36"
                />
                <div className="relative -mt-10 flex flex-wrap items-end gap-x-4 gap-y-2 px-4">
                  <CosmeticFrame frame={user.cosmetics.frame}>
                    <PictureEditor name={user.displayName} imageKey={user.avatarKey} paths={avatarPaths(user.id, user)} className="size-20 text-2xl ring-4 ring-card" />
                  </CosmeticFrame>
                  <p className="pb-1 text-xs text-muted-foreground">{media("coverHint")}</p>
                </div>
              </div>
              <OverviewForm key={keys.overview} user={user} profile={profile} />
            </div>
          </ProfileSection>
          <ProfileSection
            id="game"
            title={sections[1].title}
            action={<LookingToggle id="profile-looking" game={game} lookingStatus={profile.lookingStatus} />}
          >
            <GameProfileSection key={keys.game} profile={profile} game={game} />
          </ProfileSection>
          <ProfileSection id="riot" title={sections[2].title} action={<RiotStatusBadge profile={profile} />}>
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
          <ProfileSection id="playstyle" title={sections[3].title}>
            <PlaystyleCard user={user} profile={profile} game={game} />
          </ProfileSection>
          <ProfileSection id="teams" title={sections[4].title}>
            <TeamsCard teams={profileView.teams} />
          </ProfileSection>
          <ProfileSection id="achievements" title={sections[5].title}>
            <AchievementGallery achievements={achievements} owner={{ owner: "user" }} canEdit />
          </ProfileSection>
          <ProfileSection id="cosmetics" title={sections[6].title}>
            <CosmeticsShop name={user.displayName} avatarKey={user.avatarKey} />
          </ProfileSection>
          <ProfileSection id="settings" title={sections[7].title}>
            <BlockedUsersList />
          </ProfileSection>
        </ProfileDraft>
      </div>
    </div>
  );
}

export function MyProfileScreen() {
  const { t } = useProfileMessages();
  const { game } = useActiveGame();
  const query = useMyProfile(game);
  useScrollToHash(query.isSuccess);

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
