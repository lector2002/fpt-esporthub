"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { BrowseToolbar, FilterSelect, matchesQuery, RecommendedSection, ShowMoreList } from "@/components/common/browse";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatRank, type PlayMode } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useMyTeams, useRankOptions, useRecruitingTeams, useRoleOptions } from "../api";
import { rankTiers, tierIndex, useTeamLabels } from "../labels";
import { useTeamMessages } from "../messages";
import type { LookupOption, TeamSummary } from "../types";
import { NoGameState } from "./no-game-state";
import { TeamCard } from "./team-card";

const ALL = "all";
const PAGE_SIZE = 12;
const RECOMMENDED = 3;

export function TeamsPage() {
  const { game } = useActiveGame();
  const { t } = useTeamMessages();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("pageTitle")}
        image="/images/hero-teams.webp"
        actions={
          game && (
            <Button asChild>
              <Link href="/teams/new">
                <Plus /> {t("createTeam")}
              </Link>
            </Button>
          )
        }
      />
      {game ? <TeamsContent /> : <NoGameState />}
    </div>
  );
}

function TeamsContent() {
  const { game } = useActiveGame();
  const roles = useRoleOptions(game);
  return (
    <>
      <MyTeamsStrip roles={roles.data} />
      <RecruitingTeams roles={roles.data} />
    </>
  );
}

function MyTeamsStrip({ roles }: { roles: LookupOption[] | undefined }) {
  const { game } = useActiveGame();
  const { t } = useTeamMessages();
  const query = useMyTeams(game);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="my-teams-heading">
      <h2 id="my-teams-heading" className="text-lg font-semibold">
        {t("myTeams")}
      </h2>
      <QueryState query={query}>
        {(teams) =>
          teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noMyTeams")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} roles={roles} />
              ))}
            </div>
          )
        }
      </QueryState>
    </section>
  );
}

/** Fit of a recruiting team for the viewer's profile; 0 = don't suggest (already a member, wrong mode or out of rank). */
function teamFit(team: TeamSummary, profile: ActiveProfile, fitsRank: (team: TeamSummary) => boolean) {
  if (team.viewerMembership || !team.recruitmentOpen) return 0;
  if (team.game === "league_of_legends" && !profile.playModes.includes(team.mode)) return 0;
  if (!fitsRank(team)) return 0;
  const role = profile.role.toLowerCase();
  const roleFit = team.neededRoles.some((needed) => needed.toLowerCase() === role) ? 2 : 0;
  return 1 + roleFit + team.schedule.filter((slot) => profile.schedule.includes(slot)).length;
}

type ActiveProfile = NonNullable<ReturnType<typeof useActiveGame>["profile"]>;

/** Recommended teams (hidden while searching or filtering), then search + filters, then every recruiting team. */
function RecruitingTeams({ roles }: { roles: LookupOption[] | undefined }) {
  const { game, profile } = useActiveGame();
  const { t } = useTeamMessages();
  const labels = useTeamLabels();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(ALL);
  const [mode, setMode] = useState(ALL);
  const [slot, setSlot] = useState(ALL);
  const [fitsRank, setFitsRank] = useState(false);
  // ARAM teams have no role needs or rank range, so those filters step aside.
  const lol = game === "league_of_legends";
  const aram = lol && mode === "aram";
  const modeFilter = lol && mode !== ALL ? (mode as PlayMode) : null;
  const request = useRecruitingTeams(game, role === ALL || aram ? "" : role, modeFilter);
  const tiers = rankTiers(useRankOptions(game).data);
  const viewerTier = profile ? tierIndex(tiers, profile.rankTier) : -1;

  const fits = (team: TeamSummary) =>
    team.mode === "aram" ||
    (viewerTier >= 0 && tierIndex(tiers, team.rankMin) <= viewerTier && viewerTier <= tierIndex(tiers, team.rankMax));
  const activeFilters = Number(role !== ALL) + Number(mode !== ALL) + Number(slot !== ALL) + Number(fitsRank);
  const browsing = query.trim() !== "" || activeFilters > 0;
  const reset = () => {
    setQuery("");
    setRole(ALL);
    setMode(ALL);
    setSlot(ALL);
    setFitsRank(false);
  };

  const teams = request.data ?? [];
  const recommended =
    browsing || !profile || teams.length <= RECOMMENDED
      ? []
      : teams
          .map((team) => ({ team, fit: teamFit(team, profile, fits) }))
          .filter((entry) => entry.fit >= 2)
          .sort((a, b) => b.fit - a.fit)
          .slice(0, RECOMMENDED)
          .map((entry) => entry.team);
  const visible = teams.filter(
    (team) =>
      !recommended.includes(team) &&
      matchesQuery(query, team.name, team.captain.displayName) &&
      (slot === ALL || team.schedule.includes(slot)) &&
      (!fitsRank || aram || fits(team)),
  );
  const slots = [...new Set(teams.flatMap((team) => team.schedule))].sort();

  const filters = (idPrefix: string) => (
    <>
      {lol && (
        <FilterSelect
          id={`${idPrefix}-mode`}
          label={t("filterMode")}
          value={mode}
          onChange={setMode}
          options={[
            { value: ALL, label: t("allModes") },
            { value: "ranked", label: t("mode_ranked") },
            { value: "aram", label: t("mode_aram") },
          ]}
        />
      )}
      {!aram && (
        <FilterSelect
          id={`${idPrefix}-role`}
          label={t("filterRole")}
          value={role}
          onChange={setRole}
          options={[{ value: ALL, label: t("allRoles") }, ...(roles ?? []).map((option) => ({ value: option.id, label: option.label }))]}
        />
      )}
      <FilterSelect
        id={`${idPrefix}-slot`}
        label={t("schedule")}
        value={slot}
        onChange={setSlot}
        options={[{ value: ALL, label: t("anySlot") }, ...slots.map((value) => ({ value, label: labels.slot(value) }))]}
      />
      {profile && !aram && (
        <div className="flex h-9 items-center gap-2">
          <Switch id={`${idPrefix}-fits-rank`} checked={fitsRank} onCheckedChange={setFitsRank} />
          <Label htmlFor={`${idPrefix}-fits-rank`}>
            {t("fitsMyRank")} <span className="text-muted-foreground">({formatRank(profile)})</span>
          </Label>
        </div>
      )}
    </>
  );

  return (
    <>
      <RecommendedSection count={recommended.length}>
        {recommended.map((team) => (
          <TeamCard key={team.id} team={team} roles={roles} />
        ))}
      </RecommendedSection>
      <section className="flex flex-col gap-4" aria-labelledby="recruiting-heading">
        <h2 id="recruiting-heading" className="text-lg font-semibold">
          {t("browseTitle")}
        </h2>
        <BrowseToolbar
          query={query}
          onQuery={setQuery}
          placeholder={t("searchTeams")}
          filters={filters}
          collapseFilters
          activeFilters={activeFilters}
          onReset={reset}
          resultCount={visible.length + recommended.length}
        />
        <QueryState
          query={request}
          isEmpty={() => visible.length === 0 && recommended.length === 0}
          empty={{ icon: Users, image: "/images/empty-search.webp", title: t("noTeamsTitle"), description: t("noTeamsDescription") }}
        >
          {() => (
            <ShowMoreList key={`${game}-${query}-${role}-${mode}-${slot}-${fitsRank}`} items={visible} pageSize={PAGE_SIZE}>
              {(shown) => (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((team) => (
                    <TeamCard key={team.id} team={team} roles={roles} />
                  ))}
                </div>
              )}
            </ShowMoreList>
          )}
        </QueryState>
      </section>
    </>
  );
}
