import type { Prisma, TournamentMatch } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";

export const TOURNAMENT_SUMMARY_INCLUDE = {
  venue: { select: { id: true, name: true, address: true, city: true } },
  _count: { select: { entries: true } },
} satisfies Prisma.TournamentInclude;

export const ENTRY_INCLUDE = {
  players: {
    select: { userId: true, checkedInAt: true, user: { select: { displayName: true } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.TournamentEntryInclude;

type TournamentSummary = Prisma.TournamentGetPayload<{ include: typeof TOURNAMENT_SUMMARY_INCLUDE }>;
type EntryWithPlayers = Prisma.TournamentEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

export function toTournamentSummary(t: TournamentSummary) {
  return {
    id: t.id,
    title: t.title,
    game: toGameSlug(t.game),
    format: t.format,
    teamSize: t.teamSize,
    maxTeams: t.maxTeams,
    bestOf: t.bestOf,
    finalBestOf: t.finalBestOf,
    entryFee: t.entryFee,
    prize: t.prize,
    rules: t.rules,
    startsAt: t.startsAt,
    status: t.status,
    championEntryId: t.championEntryId,
    entryCount: t._count.entries,
    venue: t.venue,
  };
}

/** Payment status is only shown to the host and the entry's own captain. */
export function toEntryView(entry: EntryWithPlayers, showPayment: boolean) {
  return {
    id: entry.id,
    teamId: entry.teamId,
    teamName: entry.teamName,
    captainId: entry.captainId,
    seed: entry.seed,
    checkedIn: entry.checkedInAt !== null,
    paid: showPayment ? entry.paidAt !== null : null,
    players: entry.players.map((p) => ({ userId: p.userId, displayName: p.user.displayName, checkedIn: p.checkedInAt !== null })),
  };
}

/**
 * Who sees captain reports: the host sees both, a captain of the match sees only their own side plus whether the
 * other side reported (so neither can copy the other), everyone else sees none.
 */
export type ReportAccess = "all" | "none" | "A" | "B";

export function toMatchView(match: TournamentMatch, access: ReportAccess) {
  const reports = (match.reports as MatchReports | null) ?? {};
  const side = access === "A" || access === "B" ? access : null;
  return {
    id: match.id,
    key: match.key,
    bracket: match.bracket,
    round: match.round,
    position: match.position,
    bestOf: match.bestOf,
    entryAId: match.entryAId,
    entryBId: match.entryBId,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winnerEntryId: match.winnerEntryId,
    status: match.status,
    nextMatchKey: match.nextMatchKey,
    loserMatchKey: match.loserMatchKey,
    reports: access === "all" ? reports : side ? { [side]: reports[side] } : undefined,
    opponentReported: side ? Boolean(reports[side === "A" ? "B" : "A"]) : undefined,
  };
}

/** Report access for one viewer, given the captain of each entry. */
export function reportAccess(match: TournamentMatch, viewerId: string, isHost: boolean, captainOf: Map<string, string>): ReportAccess {
  if (isHost) return "all";
  if (match.entryAId && captainOf.get(match.entryAId) === viewerId) return "A";
  if (match.entryBId && captainOf.get(match.entryBId) === viewerId) return "B";
  return "none";
}

export type MatchReports = Partial<Record<"A" | "B", { scoreA: number; scoreB: number }>>;

export const MATCH_ORDER = [{ bracket: "asc" }, { round: "asc" }, { position: "asc" }] satisfies Prisma.TournamentMatchOrderByWithRelationInput[];
