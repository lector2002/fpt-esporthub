"use client";

import { useEffect, useState } from "react";
import { Link2, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { GameSlug } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { useLinkRiot, useRiotLookup, useRiotSuggestions } from "../api";
import { RIOT_ID_PATTERN, riotErrorText } from "../format";
import { useRiotMessages } from "../messages";
import type { RiotLookup, RiotSuggestion } from "../types";
import { RankedTile } from "./lol-stats-view";

const SUGGEST_DELAY_MS = 450;

/**
 * Riot ID search: matching accounts show up while typing, picking one (or searching an exact ID) opens a preview.
 * The preview links the account, or hands it to `onPick` (onboarding links after saving).
 */
export function RiotSearch({
  game,
  suggestedRiotId,
  onPick,
  onLinked,
}: {
  game: GameSlug;
  suggestedRiotId: string | null;
  onPick?: (result: RiotLookup) => void;
  onLinked?: (riotId: string) => void;
}) {
  const { t } = useRiotMessages();
  const [value, setValue] = useState(suggestedRiotId ?? "");
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [active, setActive] = useState(0);
  const lookup = useRiotLookup(game, submitted);
  const suggest = useRiotSuggestions(game, typed);

  useEffect(() => {
    const timer = setTimeout(() => setTyped(value), SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const riotId = value.trim();
  const invalid = tried && riotId !== "" && !RIOT_ID_PATTERN.test(riotId);
  const suggestions = suggest.data?.suggestions ?? [];
  // Open once typing pauses on a 3+ character name; closes when an account is picked or searched (Escape too).
  const open = typed === value && riotId !== submitted && riotId.split("#")[0].trim().length >= 3 && (suggest.isFetching || suggest.isSuccess);

  const choose = (id: string) => {
    setValue(id);
    setTyped(id);
    setTried(false);
    if (id === submitted) void lookup.refetch();
    else setSubmitted(id);
  };

  // No <form>: onboarding renders this inside its wizard form, so Enter is handled here instead.
  const search = () => {
    setTried(true);
    if (!riotId || !RIOT_ID_PATTERN.test(riotId)) return;
    choose(riotId);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setActive((current) => (current + (event.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length);
      return;
    }
    if (event.key === "Escape") {
      setTyped("");
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (open && suggestions[active]) choose(suggestions[active].riotId);
    else search();
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="search" className="flex flex-col gap-2">
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="riot-search">{t("searchLabel")}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="riot-search"
              role="combobox"
              aria-expanded={open}
              aria-controls="riot-suggestions"
              aria-activedescendant={open && suggestions[active] ? `riot-suggestion-${active}` : undefined}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setTried(false);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Name#TAG"
              aria-invalid={invalid || undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="button" variant="outline" onClick={search} disabled={!riotId || lookup.isFetching} className="shrink-0">
              {lookup.isFetching ? <Spinner /> : <Search />} {t("search")}
            </Button>
          </div>
          {invalid ? <FieldError>{t("errFormat")}</FieldError> : <FieldDescription>{t("searchHint")}</FieldDescription>}
        </Field>
        {open && <SuggestionList suggestions={suggestions} loading={suggest.isFetching} active={active} onChoose={choose} />}
      </div>
      {submitted && lookup.isFetching && <Skeleton className="h-36 w-full" />}
      {submitted && !lookup.isFetching && lookup.isError && (
        <p role="alert" className="text-sm text-destructive">
          {riotErrorText(lookup.error, t)}
        </p>
      )}
      {!lookup.isFetching && lookup.data?.status === "found" && <LookupResult game={game} result={lookup.data} onPick={onPick} onLinked={onLinked} />}
    </div>
  );
}

function rankLine(entry: RiotSuggestion["solo"]) {
  if (!entry) return null;
  return entry.division ? `${entry.tier} ${entry.division}` : entry.tier;
}

function SuggestionList({
  suggestions,
  loading,
  active,
  onChoose,
}: {
  suggestions: RiotSuggestion[];
  loading: boolean;
  active: number;
  onChoose: (riotId: string) => void;
}) {
  const { t } = useRiotMessages();
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1.5">
      <p className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
        {t("suggestTitle")}
        {loading && <Spinner className="size-3" />}
      </p>
      {suggestions.length === 0 ? (
        <p className="px-2 pb-1.5 text-sm text-muted-foreground">{loading ? t("suggestLoading") : t("suggestEmpty")}</p>
      ) : (
        <ul id="riot-suggestions" role="listbox" aria-label={t("suggestTitle")} className="flex flex-col">
          {suggestions.map((item, index) => (
            <li
              key={item.riotId}
              id={`riot-suggestion-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChoose(item.riotId)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted", index === active && "bg-muted")}
            >
              {item.iconUrl ? (
                <img src={item.iconUrl} alt="" width={40} height={40} className="size-10 shrink-0 rounded-md border border-border" />
              ) : (
                <div className="size-10 shrink-0 rounded-md bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.riotId}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[item.summonerLevel !== null ? t("level", { level: item.summonerLevel }) : null, rankLine(item.solo) ?? t("unranked")].filter(Boolean).join(" · ")}
                </p>
              </div>
              {item.source !== "riot" && (
                <Badge variant={item.source === "yours" ? "default" : "secondary"} className="shrink-0">
                  {t(item.source === "yours" ? "sourceYours" : "sourceLinked")}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LookupResult({
  game,
  result,
  onPick,
  onLinked,
}: {
  game: GameSlug;
  result: RiotLookup;
  onPick?: (result: RiotLookup) => void;
  onLinked?: (riotId: string) => void;
}) {
  const { t } = useRiotMessages();
  const link = useLinkRiot();

  const onLink = () =>
    onPick ? onPick(result) : link.mutate(
      { game, riotId: result.riotId },
      {
        onSuccess: (response) => {
          if (response.status !== "requires_rso" && !response.synced) toast.warning(t("toastLinkedNoSync"));
          else toast.success(t("toastLinked"));
          if (response.status !== "requires_rso") onLinked?.(response.riotId);
        },
        onError: (error) => toast.error(riotErrorText(error, t)),
      },
    );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        {result.iconUrl && (
          <img src={result.iconUrl} alt="" width={56} height={56} className="size-14 shrink-0 rounded-md border border-border" />
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{result.riotId}</p>
          <p className="text-sm text-muted-foreground">{t("level", { level: result.summonerLevel })}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RankedTile label="rankedSolo" entry={result.ranked.solo} />
        <RankedTile label="rankedFlex" entry={result.ranked.flex} />
      </div>
      {result.claim === "verified_by_other" ? (
        <p className="text-sm text-muted-foreground">{t("verifiedByOther")}</p>
      ) : (
        <Button type="button" onClick={onLink} disabled={link.isPending} className="self-start">
          {link.isPending ? <Spinner /> : <Link2 />} {t("thisIsMe")}
        </Button>
      )}
    </div>
  );
}
