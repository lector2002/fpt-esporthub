import type { GameSlug, PlayMode, ReputationBadge, VerificationStatus } from "@/lib/contracts";
import type { ReasonCode } from "@/features/matching/types";
import type { LookingStatus, Readiness } from "@/features/profile/types";

export interface DailyMatch {
  /** The matched player's user id. */
  id: string;
  displayName: string;
  avatarKey: string | null;
  rank: string;
  role: string;
  playModes: PlayMode[];
  reputationBadge: ReputationBadge;
  score: number;
  /** Stable codes; translate with `reasonLabel` from features/matching/messages. */
  reasons: ReasonCode[];
}

export interface LatestRequest {
  id: string;
  fromId: string;
  fromName: string;
  /** Set when the request was sent to a team the user captains. */
  teamName: string | null;
  message: string;
  createdAt: string;
}

/** GET /profiles/dashboard?game= */
export interface DashboardView {
  displayName: string;
  reputationBadge: ReputationBadge;
  game: GameSlug | null;
  /** Mode the daily matches were scored in: ranked when the profile plays it, else ARAM. */
  playMode: PlayMode | null;
  profile: {
    rank: string;
    role: string;
    bio: string | null;
    goals: string[];
    communicationStyles: string[];
    playModes: PlayMode[];
    riotId: string | null;
    verificationStatus: VerificationStatus;
    lookingStatus: LookingStatus;
  } | null;
  readiness: Readiness | null;
  counts: { pendingIncoming: number; pendingSent: number; unreadMessages: number };
  latestRequest: LatestRequest | null;
  dailyMatches: DailyMatch[];
}
