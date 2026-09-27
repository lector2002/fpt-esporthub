"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarX, Globe, MapPin } from "lucide-react";
import { BrowseToolbar, FilterSelect, matchesQuery, RecommendedSection, ShowMoreList } from "@/components/common/browse";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfflineTournamentList } from "@/features/offline-tournaments/components/tournaments-page";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { useEvents } from "../api";
import { useEventMessages } from "../messages";
import type { EventSummary, EventWhen } from "../types";
import { EventCard } from "./event-card";

type HubTab = "online" | "offline";

const ALL = "all";
const PAGE_SIZE = 12;
const RECOMMENDED = 3;

/** `/events`: one hub for online events and offline cafe cups. `?type=offline` opens the offline tab. */
export function EventsPage() {
  const { t } = useEventMessages();
  const router = useRouter();
  const tab: HubTab = useSearchParams().get("type") === "offline" ? "offline" : "online";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("pageTitle")} image="/images/hero-tournaments.webp" />
      <Tabs value={tab} onValueChange={(value) => router.replace(value === "offline" ? "/events?type=offline" : "/events", { scroll: false })}>
        <TabsList>
          <TabsTrigger value="online">
            <Globe /> {t("tabOnline")}
          </TabsTrigger>
          <TabsTrigger value="offline">
            <MapPin /> {t("tabOffline")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="online" className="pt-2">
          <OnlineEvents />
        </TabsContent>
        <TabsContent value="offline" className="pt-2">
          <OfflineTournamentList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Sort = "start" | "deadline" | "popular";

/** Recommended (open registrations closing soonest, hidden while browsing), then search + filters, then every event. */
function OnlineEvents() {
  const { t } = useEventMessages();
  const { game } = useActiveGame();
  const { status } = useSession();
  const [when, setWhen] = useState<EventWhen>("upcoming");
  const [query, setQuery] = useState("");
  const [registration, setRegistration] = useState(ALL);
  const [size, setSize] = useState(ALL);
  const [sort, setSort] = useState<Sort>("start");
  const request = useEvents(game, when, status !== "loading");
  const events = request.data ?? [];

  const activeFilters = Number(when !== "upcoming") + Number(registration !== ALL) + Number(size !== ALL);
  const browsing = query.trim() !== "" || activeFilters > 0;
  const recommended =
    browsing || events.length <= RECOMMENDED
      ? []
      : events
          .filter((event) => event.registrationOpen)
          .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt))
          .slice(0, RECOMMENDED);
  const sorters: Record<Sort, (a: EventSummary, b: EventSummary) => number> = {
    start: (a, b) => (when === "upcoming" ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)),
    deadline: (a, b) => a.deadlineAt.localeCompare(b.deadlineAt),
    popular: (a, b) => b.interestedCount - a.interestedCount,
  };
  const visible = events
    .filter(
      (event) =>
        !recommended.includes(event) &&
        matchesQuery(query, event.title, event.organizer, event.format, event.prize) &&
        (registration === ALL || event.registrationOpen) &&
        (size === ALL || String(event.teamSize) === size),
    )
    .sort(sorters[sort]);
  const sizes = [...new Set(events.flatMap((event) => (event.teamSize ? [event.teamSize] : [])))].sort((a, b) => a - b);
  const sizeLabel = (count: number) => (count === 1 ? t("teamSizeSolo") : t("teamSize", { count }));
  const reset = () => {
    setQuery("");
    setWhen("upcoming");
    setRegistration(ALL);
    setSize(ALL);
  };

  const filters = (idPrefix: string) => (
    <>
      <FilterSelect
        id={`${idPrefix}-when`}
        label={t("filterWhen")}
        value={when}
        onChange={(value) => setWhen(value as EventWhen)}
        options={[
          { value: "upcoming", label: t("upcoming") },
          { value: "past", label: t("past") },
        ]}
      />
      <FilterSelect
        id={`${idPrefix}-registration`}
        label={t("filterRegistration")}
        value={registration}
        onChange={setRegistration}
        options={[
          { value: ALL, label: t("any") },
          { value: "open", label: t("registrationOpenOnly") },
        ]}
      />
      {sizes.length > 0 && (
        <FilterSelect
          id={`${idPrefix}-size`}
          label={t("filterTeamSize")}
          value={size}
          onChange={setSize}
          options={[{ value: ALL, label: t("any") }, ...sizes.map((count) => ({ value: String(count), label: sizeLabel(count) }))]}
        />
      )}
      <FilterSelect
        id={`${idPrefix}-sort`}
        label={t("sortBy")}
        value={sort}
        onChange={(value) => setSort(value as Sort)}
        options={[
          { value: "start", label: t("sortStart") },
          { value: "deadline", label: t("sortDeadline") },
          { value: "popular", label: t("sortPopular") },
        ]}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <RecommendedSection count={recommended.length}>
        {recommended.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </RecommendedSection>
      <div className="flex flex-col gap-4">
        <BrowseToolbar
          query={query}
          onQuery={setQuery}
          placeholder={t("searchEvents")}
          filters={filters}
          collapseFilters
          activeFilters={activeFilters}
          onReset={reset}
          resultCount={visible.length + recommended.length}
        />
        <QueryState
          query={request}
          isEmpty={() => visible.length === 0 && recommended.length === 0}
          empty={{ icon: CalendarX, image: "/images/empty-events.webp", title: t(browsing ? "noResults" : when === "upcoming" ? "noUpcoming" : "noPast") }}
        >
          {() => (
            <ShowMoreList key={`${game}-${when}-${query}-${registration}-${size}-${sort}`} items={visible} pageSize={PAGE_SIZE}>
              {(shown) => (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((event) => (
                    <EventCard key={event.id} event={event} />
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
