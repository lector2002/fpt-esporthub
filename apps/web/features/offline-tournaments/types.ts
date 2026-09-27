import type { GameSlug } from "@/lib/contracts";

export type VenueStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TournamentFormat = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
export type TournamentStatus = "REGISTRATION" | "CHECK_IN" | "LIVE" | "COMPLETED" | "CANCELLED";
export type BracketSide = "WINNERS" | "LOSERS" | "GRAND_FINAL";
export type MatchStatus = "PENDING" | "READY" | "DISPUTED" | "DONE";

/** GET /venues/mine */
export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  pcCount: number;
  phone: string | null;
  status: VenueStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface VenueInput {
  name: string;
  address: string;
  city: string;
  pcCount: number;
  phone?: string;
}

/** GET /admin/venues */
export interface AdminVenue extends Venue {
  owner: { id: string; displayName: string; email: string };
  _count: { tournaments: number };
}

/** GET /offline-tournaments, GET /offline-tournaments/hosted */
export interface OfflineTournament {
  id: string;
  title: string;
  game: GameSlug;
  format: TournamentFormat;
  teamSize: number;
  maxTeams: number;
  bestOf: number;
  finalBestOf: number;
  /** VND, paid at the counter. */
  entryFee: number;
  prize: string | null;
  rules: string | null;
  startsAt: string;
  status: TournamentStatus;
  championEntryId: string | null;
  entryCount: number;
  venue: { id: string; name: string; address: string; city: string };
}

export interface TournamentInput {
  title: string;
  game: GameSlug;
  format: TournamentFormat;
  teamSize: number;
  maxTeams: number;
  bestOf: number;
  finalBestOf: number;
  entryFee: number;
  prize?: string;
  rules?: string;
  startsAt: string;
}

export interface TournamentEntry {
  id: string;
  teamId: string | null;
  teamName: string;
  captainId: string;
  seed: number | null;
  checkedIn: boolean;
  /** Null when the viewer is neither the host nor this entry's captain. */
  paid: boolean | null;
  players: { userId: string; displayName: string; checkedIn: boolean }[];
}

export interface MatchScore {
  scoreA: number;
  scoreB: number;
}

export interface TournamentMatch {
  id: string;
  key: string;
  bracket: BracketSide;
  round: number;
  position: number;
  bestOf: number;
  entryAId: string | null;
  entryBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerEntryId: string | null;
  status: MatchStatus;
  nextMatchKey: string | null;
  loserMatchKey: string | null;
  /** Host: both captain reports. Captain of the match: only their own side. Absent for everyone else. */
  reports?: Partial<Record<"A" | "B", MatchScore>>;
  /** Captain of the match only: whether the other captain has reported. */
  opponentReported?: boolean;
}

/** GET /offline-tournaments/:id */
export interface TournamentDetail {
  tournament: OfflineTournament;
  isHost: boolean;
  myEntryId: string | null;
  /** The viewer's own QR code, while check-in is still possible. */
  myCheckIn: { code: string; checkedIn: boolean } | null;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}

/** GET /public/offline-tournaments/:id/bracket */
export interface PublicBracket {
  id: string;
  title: string;
  game: GameSlug;
  format: TournamentFormat;
  status: TournamentStatus;
  startsAt: string;
  championEntryId: string | null;
  venue: { name: string; city: string };
  entries: { id: string; teamName: string; seed: number | null }[];
  matches: TournamentMatch[];
}

/** POST /offline-tournaments/check-in */
export interface CheckInResult {
  tournamentId: string;
  tournamentTitle: string;
  entryId: string;
  teamName: string;
  playerName: string;
  alreadyCheckedIn: boolean;
  playersCheckedIn: number;
  playersTotal: number;
  teamCheckedIn: boolean;
  paid: boolean;
}
