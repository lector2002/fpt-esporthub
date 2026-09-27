"use client";

import { createContext, useContext, useState } from "react";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { defineMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Shared layout for list tabs: Recommended row, then a search + filter toolbar, then the full list.

const useMessages = defineMessages({
  vi: {
    recommended: "Gợi ý cho bạn",
    filters: "Bộ lọc",
    resetFilters: "Xóa bộ lọc",
    results: "{count} kết quả",
    showResults: "Xem {count} kết quả",
    showMore: "Xem thêm",
    shownOf: "Đang xem {shown}/{total}",
  },
  en: {
    recommended: "Recommended for you",
    filters: "Filters",
    resetFilters: "Clear filters",
    results: "{count} results",
    showResults: "Show {count} results",
    showMore: "Show more",
    shownOf: "Showing {shown} of {total}",
  },
});

/**
 * Suggestions above the list: a swipeable row on phone, a grid from `md` (`gridClassName` sets the columns).
 * Children are the cards themselves. Renders nothing when there is nothing to suggest.
 */
export function RecommendedSection({
  title,
  count,
  gridClassName = "md:grid-cols-2 xl:grid-cols-3",
  children,
}: {
  title?: string;
  count: number;
  gridClassName?: string;
  children: React.ReactNode;
}) {
  const { t } = useMessages();
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-3" data-testid="recommended" aria-label={title ?? t("recommended")}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden />
        {title ?? t("recommended")}
      </h2>
      <div className={cn("relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 *:w-[85%] *:shrink-0 *:snap-start md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0 md:*:w-auto", gridClassName)}>
        {children}
      </div>
    </section>
  );
}

/** Inline filters sit on the search row with the label inside the trigger; stacked ones (sheet, popover) get a label above. */
const FilterLayout = createContext<"inline" | "stacked">("stacked");

interface BrowseToolbarProps {
  query: string;
  onQuery: (query: string) => void;
  placeholder: string;
  /** Filter fields; rendered for desktop and again in the phone sheet, so ids get a prefix. */
  filters?: (idPrefix: string) => React.ReactNode;
  /** Many filters: on desktop they open from a "Filters" popover instead of sitting on the search row. */
  collapseFilters?: boolean;
  activeFilters?: number;
  onReset?: () => void;
  resultCount: number;
  /** Extra items on the right of the count, e.g. a sent-requests link. */
  aside?: React.ReactNode;
}

/** One row: search, filters (inline or a popover from `lg`, a bottom sheet below), result count. */
export function BrowseToolbar({ query, onQuery, placeholder, filters, collapseFilters = false, activeFilters = 0, onReset, resultCount, aside }: BrowseToolbarProps) {
  const { t } = useMessages();
  const filterLabel = (
    <>
      <SlidersHorizontal /> {t("filters")}
      {activeFilters > 0 && (
        <Badge variant="secondary" className="tabular-nums">
          {activeFilters}
        </Badge>
      )}
    </>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-8" />
        </div>
        {filters && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                {filterLabel}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="gap-4 p-4">
              <SheetHeader className="p-0">
                <SheetTitle>{t("filters")}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4">{filters("mobile")}</div>
              <SheetFooter className="p-0">
                <SheetClose asChild>
                  <Button className="tabular-nums">{t("showResults", { count: resultCount })}</Button>
                </SheetClose>
                <Button variant="ghost" disabled={activeFilters === 0} onClick={onReset}>
                  {t("resetFilters")}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
        {filters &&
          (collapseFilters ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="hidden lg:inline-flex">
                  {filterLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="flex w-80 flex-col gap-4">
                {filters("desktop")}
                <Button variant="ghost" disabled={activeFilters === 0} onClick={onReset} className="self-end">
                  {t("resetFilters")}
                </Button>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="hidden lg:contents">
              <FilterLayout.Provider value="inline">{filters("desktop")}</FilterLayout.Provider>
            </div>
          ))}
        {filters && !collapseFilters && activeFilters > 0 && (
          <Button variant="ghost" onClick={onReset} className="hidden lg:inline-flex">
            {t("resetFilters")}
          </Button>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
          {aside}
          <p className="tabular-nums">{t("results", { count: resultCount })}</p>
        </div>
    </div>
  );
}

export interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function FilterSelect({ id, label, value, onChange, options }: FilterSelectProps) {
  if (useContext(FilterLayout) === "inline") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} className="w-auto max-w-56">
          <span className="text-muted-foreground">{label}:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Renders the first `pageSize` items and a "Show more" button for the rest. Key it on the filters to start over. */
export function ShowMoreList<T>({ items, pageSize, children }: { items: T[]; pageSize: number; children: (shown: T[]) => React.ReactNode }) {
  const { t } = useMessages();
  const [limit, setLimit] = useState(pageSize);
  const shown = items.slice(0, limit);
  return (
    <>
      {children(shown)}
      {shown.length < items.length && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button variant="outline" onClick={() => setLimit((current) => current + pageSize)}>
            {t("showMore")}
          </Button>
          <p className="text-xs text-muted-foreground tabular-nums">{t("shownOf", { shown: shown.length, total: items.length })}</p>
        </div>
      )}
    </>
  );
}

/** Case- and accent-insensitive "contains", so "le" finds "Lê" and "lee sin" finds "Lee Sin". */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]) {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();
  const needle = normalize(query.trim());
  return needle === "" || fields.some((field) => field && normalize(field).includes(needle));
}
