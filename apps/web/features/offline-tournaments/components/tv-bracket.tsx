"use client";

import { MapPin, Swords } from "lucide-react";
import { GameBadge } from "@/components/common/badges";
import { EmptyState } from "@/components/common/query-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicBracket } from "../api";
import { useOfflineMessages } from "../messages";
import { BracketView } from "./bracket-view";
import { TournamentStatusBadge } from "./status-badge";

/** Every screen in the cafe polls the same URL; the API does not rate limit it. */
const TV_REFRESH_MS = 10_000;

export function TvBracket({ id }: { id: string }) {
  const { t } = useOfflineMessages();
  const query = usePublicBracket(id, TV_REFRESH_MS);

  if (query.isPending) return <Skeleton className="m-8 h-[80svh]" />;
  // Keep the last bracket on a failed poll; only a first load that fails shows the error.
  if (!query.data) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <EmptyState icon={Swords} title={t("tvNotFound")} />
      </div>
    );
  }

  const bracket = query.data;
  return (
    <main className="flex min-h-svh flex-col gap-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-3">
            <TournamentStatusBadge status={bracket.status} className="text-base" />
            <GameBadge game={bracket.game} className="text-base" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight">{bracket.title}</h1>
          <p className="flex items-center gap-2 text-xl text-muted-foreground">
            <MapPin className="size-5" aria-hidden /> {bracket.venue.name} · {bracket.venue.city}
          </p>
        </div>
        <p className="text-lg text-muted-foreground">{t(`format_${bracket.format}`)}</p>
      </header>
      {bracket.matches.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-3xl text-muted-foreground">{t("tvWaiting")}</p>
          <ul className="flex max-w-5xl flex-wrap justify-center gap-3">
            {bracket.entries.map((entry) => (
              <li key={entry.id} className="rounded-md border bg-card px-4 py-2 text-xl">
                {entry.teamName}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <BracketView
          format={bracket.format}
          matches={bracket.matches}
          entries={bracket.entries}
          championEntryId={bracket.championEntryId}
          size="tv"
        />
      )}
    </main>
  );
}
