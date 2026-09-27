"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, GraduationCap, Search, UserRoundPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ListSkeleton, QueryState } from "@/components/common/query-state";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { useCoaches, useMyCoachProfile } from "../api";
import { formatVnd } from "../format";
import { useCoachingMessages } from "../messages";
import type { CoachSummary } from "../types";
import { CoachCard } from "./coach-card";

const PRICE_STEPS = [100_000, 200_000, 300_000, 500_000, 1_000_000];
const ANY = "any";

interface Filters {
  search: string;
  maxPrice: string;
}

const NO_FILTERS: Filters = { search: "", maxPrice: ANY };

function matchesFilters(coach: CoachSummary, { search, maxPrice }: Filters) {
  const query = search.trim().toLowerCase();
  if (query && !coach.specialties.some((item) => item.toLowerCase().includes(query))) return false;
  return maxPrice === ANY || coach.hourlyRate <= Number(maxPrice);
}

function HeaderActions() {
  const { t } = useCoachingMessages();
  const mine = useMyCoachProfile();
  return (
    <>
      <Button asChild variant="outline">
        <Link href="/coaches/me">
          <UserRoundPen /> {mine.data ? t("myCoachProfile") : t("becomeCoach")}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/coaches/sessions">
          <CalendarCheck /> {t("mySessions")}
        </Link>
      </Button>
    </>
  );
}

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (filters: Filters) => void }) {
  const { t } = useCoachingMessages();
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={t("searchSpecialty")}
          placeholder={t("searchSpecialty")}
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </InputGroup>
      <Select value={filters.maxPrice} onValueChange={(maxPrice) => onChange({ ...filters, maxPrice })}>
        <SelectTrigger aria-label={t("maxPrice")} className="w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{t("anyPrice")}</SelectItem>
          {PRICE_STEPS.map((step) => (
            <SelectItem key={step} value={String(step)}>
              {t("upTo", { amount: formatVnd(step) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CoachResults({ game }: { game: GameSlug }) {
  const { t } = useCoachingMessages();
  const coaches = useCoaches(game);
  const [filters, setFilters] = useState(NO_FILTERS);
  return (
    <>
      <FilterBar filters={filters} onChange={setFilters} />
      <QueryState
        query={coaches}
        skeleton={<ListSkeleton rows={4} />}
        isEmpty={(data) => data.length === 0}
        empty={{ icon: GraduationCap, image: "/images/empty-search.webp", title: t("emptyCoaches", { game: GAMES[game].label }) }}
      >
        {(data) => {
          const filtered = data.filter((coach) => matchesFilters(coach, filters));
          if (filtered.length === 0) {
            return (
              <EmptyState
                icon={Search}
                image={"/images/empty-search.webp"}
                title={t("emptyFiltered")}
                action={
                  <Button variant="outline" onClick={() => setFilters(NO_FILTERS)}>
                    {t("clearFilters")}
                  </Button>
                }
              />
            );
          }
          return (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((coach) => (
                <CoachCard key={coach.id} coach={coach} />
              ))}
            </div>
          );
        }}
      </QueryState>
    </>
  );
}

export function CoachList() {
  const { t } = useCoachingMessages();
  const { game } = useActiveGame();
  const { status } = useSession();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} image="/images/hero-coaching.webp" actions={<HeaderActions />} />
      {game ? (
        <CoachResults key={game} game={game} />
      ) : status === "loading" ? (
        <ListSkeleton rows={4} />
      ) : (
        <EmptyState
          icon={GraduationCap}
          title={t("noGameTitle")}
          action={
            <Button asChild>
              <Link href="/onboarding">{t("createGameProfile")}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
