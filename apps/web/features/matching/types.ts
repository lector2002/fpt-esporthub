import type { CosmeticsView, GameSlug, PlayMode, ReputationBadge, VerificationStatus } from "@/lib/contracts";

export type MatchMode = "find_players" | "find_teams";

export type ReasonCode =
  | "similar_rank"
  | "role_fit"
  | "schedule_overlap"
  | "shared_goals"
  | "comm_fit"
  | "high_reputation"
  | "same_campus";

export type MatchRequestState = "pending_sent" | "pending_received" | "connected";

interface RequestStateFields {
  requestStatus: MatchRequestState | null;
  requestId: string | null;
  conversationId: string | null;
}

export interface PlayerMatch extends RequestStateFields {
  type: "player";
  id: string;
  displayName: string;
  avatarKey: string | null;
  coverKey: string | null;
  cosmetics: CosmeticsView;
  game: GameSlug;
  rankTier: string;
  rankLevel: number | null;
  role: string;
  schedule: string[];
  playModes: PlayMode[];
  /** Champion or agent ids, favourite first. */
  mains: string[];
  /** Champion in the latest synced LoL match; card art when no mains are set. */
  recentChampion: string | null;
  bio: string | null;
  reputationBadge: ReputationBadge;
  verificationStatus: VerificationStatus;
  boosted: boolean;
  score: number;
  reasons: ReasonCode[];
}

export interface TeamMatch extends RequestStateFields {
  type: "team";
  id: string;
  name: string;
  logoKey: string | null;
  coverKey: string | null;
  captainId: string;
  captainName: string;
  game: GameSlug;
  mode: PlayMode;
  rankMin: string;
  rankMax: string;
  neededRoles: string[];
  memberCount: number;
  maxMembers: number;
  schedule: string[];
  description: string | null;
  featured: boolean;
  score: number;
  reasons: ReasonCode[];
}

export type MatchResult = PlayerMatch | TeamMatch;

export interface FindMatchResponse {
  matches: MatchResult[];
  /** Mode the results were scored in; ARAM scores ignore rank and role. */
  playMode: PlayMode;
  profile: {
    game: GameSlug;
    rankTier: string;
    rankLevel: number | null;
    role: string;
    schedule: string[];
    playModes: PlayMode[];
    updatedAt: string;
  };
  stats: { totalSuggestions: number; averageScore: number; pendingSent: number; accepted: number };
}

export interface MatchFilters {
  role: string;
  minScore: number;
  slot: string;
  /** Players only: rank tier. */
  rank: string;
}

export const ALL = "all";

export const DEFAULT_FILTERS: MatchFilters = { role: ALL, minScore: 0, slot: ALL, rank: ALL };
