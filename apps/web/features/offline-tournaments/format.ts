import type { Language } from "@/lib/i18n";
import type { BracketSide, MatchScore, TournamentMatch } from "./types";

export function formatVnd(amount: number, language: Language) {
  return new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", { style: "currency", currency: "VND" }).format(amount);
}

/** Same rule as the API: the winner takes exactly the majority of games. */
export function isValidScore(bestOf: number, { scoreA, scoreB }: MatchScore) {
  const needed = Math.ceil(bestOf / 2);
  return Math.max(scoreA, scoreB) === needed && Math.min(scoreA, scoreB) < needed;
}

export const SIDES: BracketSide[] = ["WINNERS", "LOSERS", "GRAND_FINAL"];

/** Matches of one bracket side, grouped by round in play order. */
export function roundsOf(matches: TournamentMatch[], side: BracketSide) {
  const rounds = new Map<number, TournamentMatch[]>();
  for (const match of matches.filter((m) => m.bracket === side)) {
    rounds.set(match.round, [...(rounds.get(match.round) ?? []), match]);
  }
  return [...rounds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, list]) => ({ round, matches: list.sort((a, b) => a.position - b.position) }));
}

/** Local datetime-local value for a Date, e.g. "2026-10-01T19:00". */
export function toDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
