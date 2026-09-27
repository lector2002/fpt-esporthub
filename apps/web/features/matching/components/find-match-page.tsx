"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Rocket, SearchX, UserRoundPen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrowseToolbar, RecommendedSection, ShowMoreList } from "@/components/common/browse";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ListSkeleton, QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError } from "@/lib/api-client";
import { INBOX_REQUESTS_HREF } from "@/features/requests/api";
import { primaryPlayMode, type PlayMode } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { useFindMatches } from "../api";
import { activeFilterCount, applyFilters, filterOptions, matchesSearch } from "../filters";
import { useMatchingMessages } from "../messages";
import { DEFAULT_FILTERS, type MatchMode, type MatchResult } from "../types";
import { MatchCard } from "./match-card";
import { MatchFilterFields } from "./match-filters";

const PAGE_SIZE = 20;
/** Paid results pinned above the rest; any others fall into the list by score. */
const MAX_PROMOTED = 3;
const RECOMMENDED = 3;

/** Whether the viewer shows up in other people's results; the switch lives on Home. */
function VisibilityChip({ open }: { open: boolean }) {
  const { t } = useMatchingMessages();
  const Icon = open ? Eye : EyeOff;
  return (
    <Button asChild variant="ghost" size="sm" className={open ? "text-success" : "text-muted-foreground"}>
      <Link href="/dashboard">
        <Icon /> {t(open ? "visible" : "hidden")}
      </Link>
    </Button>
  );
}

export function FindMatchPage() {
  const { t } = useMatchingMessages();
  const { status } = useSession();
  const { game, profile } = useActiveGame();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} image="/images/hero-find-match.webp" actions={profile?.onboardingComplete ? <VisibilityChip open={profile.lookingStatus === "open_to_match"} /> : undefined} />
      {status === "loading" ? (
        <ListSkeleton />
      ) : !profile?.onboardingComplete ? (
        <OnboardingPrompt />
      ) : (
        <MatchTabs key={profile.id} lol={game === "league_of_legends"} initialPlayMode={primaryPlayMode(profile.playModes)} />
      )}
    </div>
  );
}

/** Players/Teams tabs; LoL adds a Ranked/ARAM toggle that starts on the profile's main mode. */
function MatchTabs({ lol, initialPlayMode }: { lol: boolean; initialPlayMode: PlayMode }) {
  const { t } = useMatchingMessages();
  const [mode, setMode] = useState<MatchMode>("find_players");
  const [playMode, setPlayMode] = useState<PlayMode>(lol ? initialPlayMode : "ranked");

  return (
    <Tabs value={mode} onValueChange={(value) => setMode(value as MatchMode)} className="gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <TabsList>
          <TabsTrigger value="find_players">{t("players")}</TabsTrigger>
          <TabsTrigger value="find_teams">{t("teams")}</TabsTrigger>
        </TabsList>
        {lol && (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            aria-label={t("playMode")}
            value={playMode}
            onValueChange={(value) => value && setPlayMode(value as PlayMode)}
          >
            <ToggleGroupItem value="ranked" className="data-[state=on]:text-primary">
              {t("ranked")}
            </ToggleGroupItem>
            <ToggleGroupItem value="aram" className="data-[state=on]:text-primary">
              {t("aram")}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
      <TabsContent value="find_players">
        <MatchResults mode="find_players" playMode={playMode} />
      </TabsContent>
      <TabsContent value="find_teams">
        <MatchResults mode="find_teams" playMode={playMode} />
      </TabsContent>
    </Tabs>
  );
}

function OnboardingPrompt() {
  const { t } = useMatchingMessages();
  return (
    <EmptyState
      icon={UserRoundPen}
      title={t("onboardingTitle")}
      description={t("onboardingDescription")}
      action={
        <Button asChild>
          <Link href="/onboarding">{t("onboardingCta")}</Link>
        </Button>
      }
    />
  );
}

function MatchResults({ mode, playMode }: { mode: MatchMode; playMode: PlayMode }) {
  const { t } = useMatchingMessages();
  const { game } = useActiveGame();
  const query = useFindMatches(mode, playMode);

  if (query.error instanceof ApiError && query.error.status === 403) return <OnboardingPrompt />;

  return (
    <QueryState
      query={query}
      skeleton={<ListSkeleton rows={4} />}
      isEmpty={(data) => data.matches.length === 0}
      empty={{ icon: SearchX, image: "/images/empty-search.webp", title: t("emptyTitle"), description: t("emptyDescription") }}
    >
      {(data) => <FilteredResults key={`${game}-${playMode}`} matches={data.matches} aram={data.playMode === "aram"} sent={data.stats.pendingSent} />}
    </QueryState>
  );
}

function isPromoted(match: MatchResult) {
  return match.type === "player" ? match.boosted : match.featured;
}

/** Recommended (best scores, hidden while searching or filtering), then search + filters, then everything else. */
function FilteredResults({ matches, aram, sent }: { matches: MatchResult[]; aram: boolean; sent: number }) {
  const { t } = useMatchingMessages();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const options = useMemo(() => filterOptions(matches), [matches]);
  const browsing = query.trim() !== "" || activeFilterCount(filters) > 0;
  const recommended = browsing || matches.length <= RECOMMENDED ? [] : [...matches].sort((a, b) => b.score - a.score).slice(0, RECOMMENDED);
  const visible = applyFilters(matches, filters).filter((match) => matchesSearch(match, query) && !recommended.includes(match));
  const promoted = visible.filter(isPromoted).slice(0, MAX_PROMOTED);
  const rest = visible.filter((match) => !promoted.includes(match)).sort((a, b) => b.score - a.score);
  const players = matches.some((match) => match.type === "player");
  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-6">
      <RecommendedSection count={recommended.length}>
        {recommended.map((match) => (
          <MatchCard key={`${match.type}-${match.id}`} match={match} aram={aram} />
        ))}
      </RecommendedSection>
      <div className="flex flex-col gap-4">
        <BrowseToolbar
          query={query}
          onQuery={setQuery}
          placeholder={t(players ? "searchPlayers" : "searchTeams")}
          collapseFilters
          filters={(idPrefix) => (
            <MatchFilterFields
              idPrefix={idPrefix}
              filters={filters}
              onChange={setFilters}
              roles={aram ? undefined : options.roles}
              slots={options.slots}
              ranks={players ? options.ranks : undefined}
            />
          )}
          activeFilters={activeFilterCount(filters)}
          onReset={reset}
          resultCount={visible.length + recommended.length}
          aside={
            sent > 0 && (
              <Link href={INBOX_REQUESTS_HREF} className="hover:text-foreground hover:underline">
                {t("sentCount", { count: sent })}
              </Link>
            )
          }
        />
        {visible.length === 0 && browsing ? (
          <EmptyState
            icon={SearchX}
            image={"/images/empty-search.webp"}
            title={t("filteredEmptyTitle")}
            action={
              <Button variant="outline" size="sm" onClick={reset}>
                {t("resetFilters")}
              </Button>
            }
          />
        ) : (
          <>
            {promoted.length > 0 && (
              <MatchGroup title={t("promotedGroup")} icon={Rocket} matches={promoted} aram={aram} testId="promoted-group" />
            )}
            <ShowMoreList key={`${query}-${JSON.stringify(filters)}`} items={rest} pageSize={PAGE_SIZE}>
              {(shown) =>
                shown.length > 0 && <MatchGroup title={promoted.length > 0 ? t("bestGroup") : undefined} count={rest.length} matches={shown} aram={aram} />
              }
            </ShowMoreList>
          </>
        )}
      </div>
    </div>
  );
}

function MatchGrid({ matches, aram }: { matches: MatchResult[]; aram: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => (
        <MatchCard key={`${match.type}-${match.id}`} match={match} aram={aram} />
      ))}
    </div>
  );
}

function MatchGroup({ title, icon: Icon, count, matches, aram, testId }: { title?: string; icon?: LucideIcon; count?: number; matches: MatchResult[]; aram: boolean; testId?: string }) {
  return (
    <section className="flex flex-col gap-3" data-testid={testId}>
      {title && (
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="size-4 text-primary" aria-hidden />}
          {title}
          {count !== undefined && (
            <Badge variant="secondary" className="tabular-nums">
              {count}
            </Badge>
          )}
        </h2>
      )}
      <MatchGrid matches={matches} aram={aram} />
    </section>
  );
}
