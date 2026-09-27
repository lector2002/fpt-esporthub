import type { GameSlug, PlayMode, ReputationBadge } from "@/lib/contracts";
import type { Achievement } from "@/features/media/types";

export type ViewerMembership = "captain" | "member" | null;

export const SCHEDULE_SLOTS = ["weekday_morning", "weekday_afternoon", "weekday_evening", "late_night", "weekend"] as const;
export const TEAM_MAX_GOALS = 2;
export const TEAM_NAME_MIN = 3;
export const TEAM_NAME_MAX = 32;
export const TEAM_DESCRIPTION_MAX = 500;

/** GET /teams, GET /teams/mine */
export interface TeamSummary {
  id: string;
  name: string;
  logoKey: string | null;
  coverKey: string | null;
  /** Set while a paid featured-recruitment slot is active. */
  featuredUntil: string | null;
  game: GameSlug;
  /** LoL: "ranked" or "aram". ARAM teams store the full ladder and no needed roles. */
  mode: PlayMode;
  description: string | null;
  rankMin: string;
  rankMax: string;
  neededRoles: string[];
  schedule: string[];
  goals: string[];
  communicationStyle: string;
  recruitmentOpen: boolean;
  memberCount: number;
  maxMembers: number;
  captain: { id: string; displayName: string };
  viewerMembership: ViewerMembership;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberView {
  userId: string;
  displayName: string;
  avatarKey: string | null;
  teamRole: "captain" | "member";
  reputationBadge: ReputationBadge;
  profile: { rankTier: string; rankLevel: number | null; role: string } | null;
  joinedAt: string;
}

/** GET /teams/:id */
export interface TeamDetail extends TeamSummary {
  /** Members only: the team room's chat. */
  conversationId: string | null;
  members: TeamMemberView[];
  achievements: Achievement[];
}

/** POST /teams body; PUT /teams/:id takes the same fields minus game, all optional. */
export interface TeamInput {
  name: string;
  game: GameSlug;
  /** Ignored for Valorant. Rank range and needed roles are ignored for ARAM. */
  mode: PlayMode;
  description: string;
  rankMin: string;
  rankMax: string;
  neededRoles: string[];
  schedule: string[];
  goals: string[];
  communicationStyle: string;
  recruitmentOpen: boolean;
}

export interface RankOption {
  tier: string;
  level: number | null;
  label: string;
  sort: number;
}

export interface LookupOption {
  id: string;
  label: string;
}
