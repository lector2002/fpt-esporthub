import type { CoachingRequest, CoachingStatus, CoachReviewStatus } from "@/features/coaching/types";
import type { OfflineTournament, TournamentEntry, TournamentMatch, TournamentStatus, Venue, VenueStatus } from "@/features/offline-tournaments/types";
import type { GameSlug } from "@/lib/contracts";
import type { ReportStatus, UserStatus } from "./types";

export interface Person {
  id: string;
  displayName: string;
  avatarKey: string | null;
}

export type MatchRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export interface DetailReport {
  id: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  reporter: Person;
}

export interface AdminTeamDetail {
  team: {
    id: string;
    name: string;
    game: GameSlug;
    mode: string;
    rankMin: string;
    rankMax: string;
    neededRoles: string[];
    schedule: string[];
    goals: string[];
    communicationStyle: string;
    description: string | null;
    recruitmentOpen: boolean;
    logoKey: string | null;
    featuredUntil: string | null;
    createdAt: string;
    captain: Person;
    members: { role: string; createdAt: string; user: Person & { status: UserStatus } }[];
    requests: {
      id: string;
      type: "PLAYER_TO_TEAM" | "TEAM_TO_PLAYER" | "PLAYER_TO_PLAYER";
      status: MatchRequestStatus;
      createdAt: string;
      sender: Person;
      receiver: Person | null;
    }[];
    tournamentEntries: { id: string; createdAt: string; tournament: { id: string; title: string; startsAt: string; status: TournamentStatus } }[];
    messageCount: number;
    pendingRequests: number;
  };
  reports: DetailReport[];
  listLimit: number;
}

/** GET /admin/cups/:id: payments and both captain reports are always visible. */
export interface AdminCupDetail {
  tournament: OfflineTournament;
  venue: { id: string; name: string; status: VenueStatus; owner: Person };
  entries: (TournamentEntry & { paid: boolean; captain: Person; createdAt: string })[];
  matches: TournamentMatch[];
}

/** GET /admin/events/:id */
export interface AdminEventDetail {
  event: {
    id: string;
    title: string;
    game: GameSlug;
    organizer: string;
    startsAt: string;
    deadlineAt: string;
    rules: string | null;
    registrationUrl: string | null;
    format: string | null;
    prize: string | null;
    teamSize: number | null;
    createdAt: string;
    interestedCount: number;
    registrationOpen: boolean;
  };
  interests: { createdAt: string; user: Person }[];
  listLimit: number;
}

/** GET /admin/venues/:id: totals cover every cup, the list only the latest `listLimit`. */
export interface AdminVenueDetail {
  venue: Venue & { owner: Person & { email: string; status: UserStatus } };
  cups: { id: string; title: string; game: GameSlug; status: TournamentStatus; startsAt: string; entryFee: number; maxTeams: number; entries: number; paidEntries: number }[];
  totals: { cups: number; entries: number; feesCollected: number };
  listLimit: number;
}

/** GET /admin/coaches/:id: `earned` and `paidOut` are credits over the coach's whole ledger. */
export interface AdminCoachDetail {
  coach: {
    id: string;
    game: GameSlug;
    specialties: string[];
    hourlyRate: number;
    bio: string;
    availability: string[];
    active: boolean;
    reviewStatus: CoachReviewStatus;
    reviewNote: string | null;
    reviewedAt: string | null;
    payableCredits: number;
    createdAt: string;
    user: Person & { email: string; status: UserStatus };
    requests: {
      id: string;
      status: CoachingStatus;
      settlement: CoachingRequest["settlement"];
      proposedStartAt: string;
      durationMinutes: number;
      proposedPrice: number;
      creditHold: number | null;
      createdAt: string;
      player: Person;
    }[];
    payouts: { id: string; amount: number; kind: "EARNING" | "PAYOUT"; note: string | null; createdAt: string }[];
    feedbacks: { id: string; rating: number; comment: string; createdAt: string; player: Person }[];
  };
  stats: { sessions: Partial<Record<CoachingStatus, number>>; earned: number; paidOut: number; averageRating: number | null; feedbackCount: number };
  listLimit: number;
}

/** A row of GET /admin/communities. `game` null = any game. */
export interface AdminCommunityRow {
  id: string;
  name: string;
  game: GameSlug | null;
  iconKey: string | null;
  createdAt: string;
  owner: Person;
  memberCount: number;
  channelCount: number;
}

/** GET /admin/communities/:id: members stop at `memberLimit`, `memberCount` is the real total. */
export interface AdminCommunityDetail {
  community: Omit<AdminCommunityRow, "channelCount"> & {
    description: string | null;
    coverKey: string | null;
    members: { role: string; createdAt: string; user: Person & { status: UserStatus } }[];
  };
  channels: { id: string; name: string; kind: "TEXT" | "VOICE"; messageCount: number; lastMessageAt: string | null }[];
  memberLimit: number;
}
