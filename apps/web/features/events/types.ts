import type { GameSlug, ReputationBadge, PlayMode } from "@/lib/contracts";
import type { TeamSummary } from "@/features/teams/types";

export type EventWhen = "upcoming" | "past";

/** GET /tournaments item */
export interface EventSummary {
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
  updatedAt: string;
  interestedCount: number;
  viewerInterested: boolean;
  registrationOpen: boolean;
}

export interface InterestedPlayer {
  id: string;
  displayName: string;
  avatarKey: string | null;
  reputationBadge: ReputationBadge;
  rankTier: string;
  rankLevel: number | null;
  role: string;
  playModes: PlayMode[];
}

/** GET /tournaments/:id */
export interface EventDetail extends EventSummary {
  /** Empty for signed-out viewers. Excludes the viewer and blocked users. */
  interestedPlayers: InterestedPlayer[];
  /** Up to 10 open, non-full teams for the event's game. */
  recruitingTeams: TeamSummary[];
}
