"use client";

import { useState } from "react";
import Link from "next/link";
import { MessagesSquare, Plus, Volume2 } from "lucide-react";
import { BrowseToolbar, FilterSelect, matchesQuery, RecommendedSection, ShowMoreList } from "@/components/common/browse";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { communityHref, useCommunities, useMyCommunities } from "../api";
import { useCommunityMessages } from "../messages";
import type { CommunitySummary } from "../types";
import { CommunityCard, CommunityIcon } from "./community-card";
import { CreateCommunityDialog } from "./community-form";

const ALL = "all";
const PAGE_SIZE = 12;
const RECOMMENDED = 3;
const GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

export function CommunitiesPage() {
  const { t } = useCommunityMessages();
  const { game } = useActiveGame();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("pageTitle")}
        image="/images/hero-communities.webp"
        actions={
          <CreateCommunityDialog
            defaultGame={game}
            trigger={
              <Button>
                <Plus /> {t("createCommunity")}
              </Button>
            }
          />
        }
      />
      <MyCommunities />
      <Discover />
    </div>
  );
}

/** Quick way back into the communities the viewer joined, with who is talking right now. */
function MyCommunities() {
  const { t } = useCommunityMessages();
  const query = useMyCommunities();

  return (
    <section className="flex flex-col gap-3" aria-labelledby="my-communities-heading">
      <h2 id="my-communities-heading" className="text-lg font-semibold">
        {t("yourCommunities")}
      </h2>
      <QueryState query={query}>
        {(communities) =>
          communities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noCommunities")}</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {communities.map((community) => (
                <li key={community.id}>
                  <MyCommunityTile community={community} />
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
    </section>
  );
}

function MyCommunityTile({ community }: { community: CommunitySummary }) {
  const { t } = useCommunityMessages();
  return (
    <Link
      href={communityHref(community.id)}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <CommunityIcon community={community} className="size-11" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{community.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {community.inVoice > 0 ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Volume2 className="size-3.5" aria-hidden />
              {t("inVoiceCount", { count: community.inVoice })}
            </span>
          ) : (
            t("memberCount", { count: community.memberCount })
          )}
        </span>
      </span>
    </Link>
  );
}

/** Suggested communities for the active game (hidden while searching or filtering), then search + game filter, then all. */
function Discover() {
  const { t } = useCommunityMessages();
  const { game: activeGame } = useActiveGame();
  const request = useCommunities(null);
  const [query, setQuery] = useState("");
  const [game, setGame] = useState(ALL);

  const browsing = query.trim() !== "" || game !== ALL;
  const communities = request.data ?? [];
  const recommended = browsing
    ? []
    : communities.filter((c) => !c.viewerRole && (c.game === activeGame || c.game === null)).slice(0, RECOMMENDED);
  const visible = communities.filter(
    (c) =>
      !recommended.includes(c) &&
      matchesQuery(query, c.name, c.description, c.owner.displayName) &&
      (game === ALL || (game === "any" ? c.game === null : c.game === game)),
  );
  const options = [
    { value: ALL, label: t("allGames") },
    { value: "valorant", label: GAMES.valorant.label },
    { value: "league_of_legends", label: GAMES.league_of_legends.label },
    { value: "any", label: t("anyGame") },
  ];

  return (
    <>
      <RecommendedSection count={recommended.length}>
        {recommended.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </RecommendedSection>
      <section className="flex flex-col gap-3" aria-labelledby="discover-heading">
        <h2 id="discover-heading" className="text-lg font-semibold">
          {t("discover")}
        </h2>
        <BrowseToolbar
          query={query}
          onQuery={setQuery}
          placeholder={t("searchPlaceholder")}
          filters={(idPrefix) => (
            <FilterSelect id={`${idPrefix}-community-game`} label={t("filterGame")} value={game} onChange={setGame} options={options} />
          )}
          activeFilters={Number(game !== ALL)}
          onReset={() => {
            setQuery("");
            setGame(ALL);
          }}
          resultCount={visible.length}
        />
        <QueryState query={request}>
          {() =>
            visible.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                image="/images/empty-search.webp"
                title={browsing ? t("noResults") : t("emptyTitle")}
                description={browsing ? undefined : t("emptyHint")}
              />
            ) : (
              <ShowMoreList key={`${query}|${game}`} items={visible} pageSize={PAGE_SIZE}>
                {(shown) => (
                  <div className={GRID}>
                    {shown.map((community) => (
                      <CommunityCard key={community.id} community={community} />
                    ))}
                  </div>
                )}
              </ShowMoreList>
            )
          }
        </QueryState>
      </section>
    </>
  );
}
