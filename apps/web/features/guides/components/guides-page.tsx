"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { BrowseToolbar, FilterSelect, matchesQuery, RecommendedSection, ShowMoreList } from "@/components/common/browse";
import { QueryState } from "@/components/common/query-state";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { gameSlug } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { useGuides } from "../api";
import { useLolStatic } from "../data-dragon";
import { useGuidesMessages } from "../messages";
import { POSITIONS, type GuideSummary, type Position } from "../types";
import { PremiumCard } from "./premium-card";

type Sort = "win" | "pick" | "ban" | "name";
const ALL = "all";
const PAGE_SIZE = 36;
const RECOMMENDED = 6;
const byWinRate = (a: GuideSummary, b: GuideSummary) => (b.winRate ?? -1) - (a.winRate ?? -1);

/** A guide per main (at the viewer's role when there is one), then the best win rates at that role. */
function recommend(list: GuideSummary[], role: Position | null, mains: string[]) {
  const picks: GuideSummary[] = [];
  for (const champion of mains) {
    const guides = list.filter((guide) => guide.champion === champion).sort(byWinRate);
    const pick = guides.find((guide) => guide.position === role) ?? guides[0];
    if (pick) picks.push(pick);
  }
  const rest = list.filter((guide) => (role === null || guide.position === role) && !picks.includes(guide)).sort(byWinRate);
  return [...picks, ...rest].slice(0, RECOMMENDED);
}

/** Recommended from the viewer's LoL profile (even while another game is active), then search + filters over every guide. */
export function GuidesPage() {
  const { t, language } = useGuidesMessages();
  const guides = useGuides();
  const lol = useLolStatic(language).data;
  const lolProfile = useSession().profiles.find((profile) => gameSlug(profile.game) === "league_of_legends");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(ALL);
  const [sort, setSort] = useState<Sort>("win");

  const nameOf = (guide: GuideSummary) => lol?.champions[guide.champion]?.name ?? guide.champion;
  const list = guides.data ?? [];
  const activeFilters = Number(position !== ALL);
  const browsing = query.trim() !== "" || activeFilters > 0;
  // Profile roles are labels ("Mid", "ADC"); lowercased they are position ids. "Fill" matches none, so any position.
  const role = POSITIONS.find((item) => item === lolProfile?.role.toLowerCase()) ?? null;
  const recommended = browsing || !lolProfile || list.length <= RECOMMENDED ? [] : recommend(list, role, lolProfile.mains);
  const sorters: Record<Sort, (a: GuideSummary, b: GuideSummary) => number> = {
    win: byWinRate,
    pick: (a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1),
    ban: (a, b) => (b.banRate ?? -1) - (a.banRate ?? -1),
    name: (a, b) => nameOf(a).localeCompare(nameOf(b)),
  };
  const visible = list
    .filter((guide) => !recommended.includes(guide) && (position === ALL || guide.position === position) && matchesQuery(query, nameOf(guide), guide.champion))
    .sort(sorters[sort]);
  const reset = () => {
    setQuery("");
    setPosition(ALL);
  };

  const tile = (guide: GuideSummary) => (
    <Card key={`${guide.champion}-${guide.position}`} className="gap-0 p-0 transition-[background-color,box-shadow] hover:bg-muted/40 hover:ring-primary/50">
      <Link href={`/guides/${encodeURIComponent(guide.champion)}/${guide.position}`} className="flex items-center gap-3 p-3">
        {lol?.champions[guide.champion] ? (
          <img src={lol.champions[guide.champion].image} alt="" className="size-10 rounded-md" />
        ) : (
          <div className="size-10 rounded-md bg-muted" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{nameOf(guide)}</p>
          <p className="truncate text-xs text-muted-foreground">{t(`pos_${guide.position}`)}</p>
          {guide.winRate !== null && <p className="text-xs text-muted-foreground tabular-nums">{t("winShort", { rate: guide.winRate.toFixed(1) })}</p>}
        </div>
      </Link>
    </Card>
  );

  const filters = (idPrefix: string) => (
    <>
      <FilterSelect
        id={`${idPrefix}-position`}
        label={t("positions")}
        value={position}
        onChange={setPosition}
        options={[{ value: ALL, label: t("allPositions") }, ...POSITIONS.map((item) => ({ value: item, label: t(`pos_${item}`) }))]}
      />
      <FilterSelect
        id={`${idPrefix}-sort`}
        label={t("sortBy")}
        value={sort}
        onChange={(value) => setSort(value as Sort)}
        options={[
          { value: "win", label: t("winRate") },
          { value: "pick", label: t("pickRate") },
          { value: "ban", label: t("banRate") },
          { value: "name", label: t("sortName") },
        ]}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} image="/images/hero-guides.webp" actions={<PremiumCard compact />} />
      <RecommendedSection count={recommended.length} gridClassName="*:w-[45%] md:grid-cols-3 xl:grid-cols-6">
        {recommended.map(tile)}
      </RecommendedSection>
      <div className="flex flex-col gap-4">
        <BrowseToolbar
          query={query}
          onQuery={setQuery}
          placeholder={t("search")}
          filters={filters}
          activeFilters={activeFilters}
          onReset={reset}
          resultCount={visible.length + recommended.length}
        />
        <QueryState query={guides} isEmpty={(all) => all.length === 0} empty={{ icon: BookOpen, title: t("emptyTitle"), description: t("emptyHint") }}>
          {() =>
            visible.length === 0 && recommended.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noResults")}</p>
            ) : (
              <ShowMoreList key={`${query}-${position}-${sort}`} items={visible} pageSize={PAGE_SIZE}>
                {(shown) => <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{shown.map(tile)}</div>}
              </ShowMoreList>
            )
          }
        </QueryState>
      </div>
    </div>
  );
}
