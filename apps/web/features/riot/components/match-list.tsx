"use client";

import { cn } from "@/lib/utils";
import { championImageUrl, formatClock, formatRelativeTime, queueKey } from "../format";
import { useRiotMessages } from "../messages";
import type { LolMatchSummary } from "../types";

export function ChampionIcon({ version, name, size = 32 }: { version: string | null; name: string; size?: number }) {
  if (!version) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {name.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={championImageUrl(version, name)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-md"
    />
  );
}

function resultTone(match: LolMatchSummary) {
  if (match.remake) return "border-l-muted-foreground/40";
  return match.win ? "border-l-success" : "border-l-destructive";
}

function MatchRow({ match, version }: { match: LolMatchSummary; version: string | null }) {
  const { t, language } = useRiotMessages();
  const result = match.remake ? t("remake") : match.win ? t("win") : t("loss");
  return (
    <li className={cn("flex items-center gap-3 rounded-md border border-l-4 border-border px-3 py-2", resultTone(match))}>
      <ChampionIcon version={version} name={match.championName} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{match.championName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t(queueKey(match.queueId))} · {formatClock(match.durationSeconds)} · {formatRelativeTime(match.endedAt, language)}
        </p>
      </div>
      <div className="text-right text-sm tabular-nums">
        <p className="font-medium">
          {match.kills}/{match.deaths}/{match.assists}
        </p>
        <p className="text-xs text-muted-foreground">{match.cs} CS</p>
      </div>
      <span
        className={cn(
          "w-12 text-right text-xs font-semibold",
          match.remake ? "text-muted-foreground" : match.win ? "text-success" : "text-destructive",
        )}
      >
        {result}
      </span>
    </li>
  );
}

export function MatchList({ matches, version }: { matches: LolMatchSummary[]; version: string | null }) {
  const { t } = useRiotMessages();
  if (matches.length === 0) return <p className="text-sm text-muted-foreground">{t("noRecentGames")}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {matches.map((match) => (
        <MatchRow key={match.matchId} match={match} version={version} />
      ))}
    </ul>
  );
}
