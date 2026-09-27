"use client";

import { CircleAlert, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { roundsOf, SIDES } from "../format";
import { useOfflineMessages } from "../messages";
import type { BracketSide, TournamentFormat, TournamentMatch } from "../types";

interface BracketEntry {
  id: string;
  teamName: string;
  seed: number | null;
}

/** Shared by the player page, the host desk and the venue TV. `onSelect` makes selectable matches clickable. */
export function BracketView({
  format,
  matches,
  entries,
  championEntryId,
  highlightEntryId,
  canSelect,
  onSelect,
  size = "default",
}: {
  format: TournamentFormat;
  matches: TournamentMatch[];
  entries: BracketEntry[];
  championEntryId: string | null;
  highlightEntryId?: string | null;
  canSelect?: (match: TournamentMatch) => boolean;
  onSelect?: (match: TournamentMatch) => void;
  size?: "default" | "tv";
}) {
  const { t } = useOfflineMessages();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const sides = SIDES.filter((side) => matches.some((m) => m.bracket === side));
  const champion = championEntryId ? byId.get(championEntryId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {champion && (
        <div className={cn("flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4", size === "tv" && "p-6")}>
          <Crown className={cn("text-amber-400", size === "tv" ? "size-10" : "size-6")} aria-hidden />
          <div>
            <p className="text-sm text-muted-foreground">{t("champion")}</p>
            <p className={cn("font-semibold", size === "tv" ? "text-4xl" : "text-xl")}>{champion.teamName}</p>
          </div>
        </div>
      )}
      {sides.map((side) => (
        <section key={side} className="flex flex-col gap-3" aria-label={t(`side_${side}`)}>
          {sides.length > 1 && <h3 className={cn("font-medium text-muted-foreground", size === "tv" ? "text-xl" : "text-sm")}>{t(`side_${side}`)}</h3>}
          <div className="-mx-1 overflow-x-auto px-1 pb-2">
            <div className="flex min-w-max items-stretch gap-4">
              {roundsOf(matches, side).map(({ round, matches: roundMatches }, index, all) => (
                <div key={round} className="flex flex-col gap-2">
                  <p className={cn("text-xs font-medium uppercase text-muted-foreground", size === "tv" && "text-base")}>
                    {roundLabel(t, format, side, index, all.length)}
                  </p>
                  <div className="flex flex-1 flex-col justify-around gap-3">
                    {roundMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        byId={byId}
                        highlightEntryId={highlightEntryId}
                        size={size}
                        onSelect={onSelect && canSelect?.(match) ? () => onSelect(match) : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function roundLabel(
  t: ReturnType<typeof useOfflineMessages>["t"],
  format: TournamentFormat,
  side: BracketSide,
  index: number,
  total: number,
) {
  if (side === "GRAND_FINAL") return t("final");
  if (side === "WINNERS" && format === "SINGLE_ELIMINATION") {
    if (index === total - 1) return t("final");
    if (index === total - 2) return t("semiFinal");
  }
  return t("round", { round: index + 1 });
}

function MatchCard({
  match,
  byId,
  highlightEntryId,
  size,
  onSelect,
}: {
  match: TournamentMatch;
  byId: Map<string, BracketEntry>;
  highlightEntryId?: string | null;
  size: "default" | "tv";
  onSelect?: () => void;
}) {
  const { t } = useOfflineMessages();
  const rows = [
    { entryId: match.entryAId, score: match.scoreA },
    { entryId: match.entryBId, score: match.scoreB },
  ];
  const body = (
    <>
      {rows.map(({ entryId, score }, index) => {
        const entry = entryId ? byId.get(entryId) : undefined;
        const won = match.winnerEntryId !== null && match.winnerEntryId === entryId;
        const lost = match.winnerEntryId !== null && !won;
        return (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5",
              index === 0 && "border-b",
              entryId && entryId === highlightEntryId && "bg-primary/10",
            )}
          >
            <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">{entry?.seed ?? ""}</span>
            <span className={cn("min-w-0 flex-1 truncate", won && "font-semibold", lost && "text-muted-foreground", !entry && "italic text-muted-foreground")}>
              {entry?.teamName ?? t("tbd")}
            </span>
            <span className={cn("tabular-nums", won ? "font-semibold text-primary" : "text-muted-foreground")}>{score ?? ""}</span>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2 border-t px-3 py-1 text-xs text-muted-foreground">
        <span>{t("bestOfShort", { count: match.bestOf })}</span>
        {match.status === "DISPUTED" && (
          <span className="flex items-center gap-1 text-amber-400">
            <CircleAlert className="size-3.5" aria-hidden /> {t("disputed")}
          </span>
        )}
        {match.status === "READY" && <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />}
      </div>
    </>
  );
  const className = cn(
    "flex flex-col overflow-hidden rounded-md border bg-card text-left",
    size === "tv" ? "w-72 text-lg" : "w-56 text-sm",
    match.status === "DISPUTED" && "border-amber-500/50",
  );

  if (!onSelect) return <div className={className}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(className, "transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      aria-label={`${match.entryAId ? byId.get(match.entryAId)?.teamName : t("tbd")} - ${match.entryBId ? byId.get(match.entryBId)?.teamName : t("tbd")}`}
    >
      {body}
    </button>
  );
}
