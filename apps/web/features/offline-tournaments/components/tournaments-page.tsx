"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, Swords } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { BrowseToolbar, FilterSelect, matchesQuery, RecommendedSection, ShowMoreList } from "@/components/common/browse";
import { QueryState } from "@/components/common/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveGame } from "@/lib/game";
import { useOfflineTournaments } from "../api";
import { useOfflineMessages } from "../messages";
import type { OfflineTournament, TournamentStatus } from "../types";
import { TournamentStatusBadge } from "./status-badge";
import { TournamentMeta } from "./tournament-meta";

type Filter = "open" | "done";
const OPEN: TournamentStatus[] = ["REGISTRATION", "CHECK_IN", "LIVE"];
const isOpen = (tournament: OfflineTournament) => OPEN.includes(tournament.status);
const ALL = "all";
const PAGE_SIZE = 12;
const RECOMMENDED = 3;

/**
 * Offline tab of the tournaments hub (`/events?type=offline`): cups still taking teams (soonest first, hidden while browsing),
 * then search + filters over every cup. Open cups sort soonest first, finished ones newest first.
 */
export function OfflineTournamentList() {
  const { t } = useOfflineMessages();
  const { game } = useActiveGame();
  const request = useOfflineTournaments(game);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [city, setCity] = useState(ALL);
  const [format, setFormat] = useState(ALL);
  const list = request.data ?? [];
  const openCount = list.filter(isOpen).length;

  const activeFilters = Number(filter !== "open") + Number(city !== ALL) + Number(format !== ALL);
  const browsing = query.trim() !== "" || activeFilters > 0;
  const recommended =
    browsing || openCount <= RECOMMENDED
      ? []
      : list
          .filter((tournament) => tournament.status === "REGISTRATION")
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .slice(0, RECOMMENDED);
  const visible = list
    .filter(
      (tournament) =>
        !recommended.includes(tournament) &&
        isOpen(tournament) === (filter === "open") &&
        matchesQuery(query, tournament.title, tournament.venue.name, tournament.venue.city) &&
        (city === ALL || tournament.venue.city === city) &&
        (format === ALL || tournament.format === format),
    )
    .sort((a, b) => (filter === "open" ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)));
  const cities = [...new Set(list.map((tournament) => tournament.venue.city))].sort();
  const formats = [...new Set(list.map((tournament) => tournament.format))];
  const reset = () => {
    setQuery("");
    setFilter("open");
    setCity(ALL);
    setFormat(ALL);
  };

  const filters = (idPrefix: string) => (
    <>
      <FilterSelect
        id={`${idPrefix}-status`}
        label={t("statusFilter")}
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        options={[
          { value: "open", label: `${t("filterOpen")} (${openCount})` },
          { value: "done", label: `${t("filterDone")} (${list.length - openCount})` },
        ]}
      />
      {cities.length > 1 && (
        <FilterSelect
          id={`${idPrefix}-city`}
          label={t("filterCity")}
          value={city}
          onChange={setCity}
          options={[{ value: ALL, label: t("any") }, ...cities.map((value) => ({ value, label: value }))]}
        />
      )}
      {formats.length > 1 && (
        <FilterSelect
          id={`${idPrefix}-format`}
          label={t("format")}
          value={format}
          onChange={setFormat}
          options={[{ value: ALL, label: t("any") }, ...formats.map((value) => ({ value, label: t(`format_${value}`) }))]}
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <RecommendedSection count={recommended.length}>
        {recommended.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} href={`/tournaments/${tournament.id}`} />
        ))}
      </RecommendedSection>
      <div className="flex flex-col gap-4">
        <BrowseToolbar
          query={query}
          onQuery={setQuery}
          placeholder={t("searchCups")}
          filters={filters}
          activeFilters={activeFilters}
          onReset={reset}
          resultCount={visible.length + recommended.length}
          aside={
            <Button asChild variant="outline" size="sm">
              <Link href="/host">
                <Store /> {t("hostCta")}
              </Link>
            </Button>
          }
        />
        <QueryState
          query={request}
          isEmpty={() => visible.length === 0 && recommended.length === 0}
          empty={{
            icon: Swords,
            image: "/images/empty-events.webp",
            title: t(browsing && query.trim() ? "noCupResults" : filter === "open" ? "noOpenTournaments" : "noTournaments"),
            description: filter === "open" && !browsing ? t("noTournamentsHint") : undefined,
          }}
        >
          {() => (
            <ShowMoreList key={`${game}-${query}-${filter}-${city}-${format}`} items={visible} pageSize={PAGE_SIZE}>
              {(shown) => (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} href={`/tournaments/${tournament.id}`} />
                  ))}
                </div>
              )}
            </ShowMoreList>
          )}
        </QueryState>
      </div>
    </div>
  );
}

export function TournamentCard({ tournament, href }: { tournament: OfflineTournament; href: string }) {
  return (
    <Link href={href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-[background-color,box-shadow] group-hover:bg-muted/40 group-hover:ring-primary/50">
        <img src="/images/cafe-cup.webp" alt="" loading="lazy" className="aspect-[3/1] w-full object-cover" />
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TournamentStatusBadge status={tournament.status} />
            <GameBadge game={tournament.game} />
          </div>
          <CardTitle className="line-clamp-2">{tournament.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <TournamentMeta tournament={tournament} compact />
        </CardContent>
      </Card>
    </Link>
  );
}
