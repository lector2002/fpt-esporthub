import type { CosmeticsView, GameSlug, ReputationBadge, VerificationStatus } from "@/lib/contracts";
import type { Achievement } from "@/features/media/types";

export type CoachReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

/** GET /coaching/coaches/me: the own listing plus the admin's review note. */
export interface MyCoachProfile extends CoachSummary {
  reviewNote: string | null;
}

export interface CoachSummary {
  id: string;
  userId: string;
  displayName: string;
  avatarKey: string | null;
  coverKey: string | null;
  reputationBadge: ReputationBadge;
  cosmetics: CosmeticsView;
  /** The coach's mains in this game (from their player profile), favourite first. */
  mains: string[];
  /** Champion in the latest synced LoL match; card art when no mains are set. */
  recentChampion: string | null;
  game: GameSlug;
  rankTier: string | null;
  rankLevel: number | null;
  role: string | null;
  verificationStatus: VerificationStatus;
  specialties: string[];
  /** VND per hour, integer. */
  hourlyRate: number;
  bio: string;
  availability: string[];
  active: boolean;
  /** Listed publicly only once an admin approves it. */
  reviewStatus: CoachReviewStatus;
  avgRating: number | null;
  reviewCount: number;
  completedSessions: number;
}

export interface CoachReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  player: { id: string; displayName: string };
}

export interface CoachDetail {
  coach: CoachSummary;
  reviews: CoachReview[];
  viewerCanReview: boolean;
  viewerIsCoach: boolean;
  achievements: Achievement[];
}

export type CoachingStatus = "PENDING" | "COUNTERED" | "AGREED" | "DECLINED" | "CANCELLED";

export interface CoachingRequest {
  id: string;
  coachId: string;
  game: GameSlug;
  coachHourlyRate: number;
  viewerRole: "player" | "coach";
  counterpart: { id: string; displayName: string };
  status: CoachingStatus;
  proposedStartAt: string;
  durationMinutes: number;
  proposedPrice: number;
  message: string;
  lastProposedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  canCounter: boolean;
  canAgree: boolean;
  canDecline: boolean;
  canCancel: boolean;
  /** Credit-paid sessions only. */
  creditHold: number | null;
  settlement: "HELD" | "RELEASED" | "REFUNDED" | "DISPUTED" | null;
  canConfirm: boolean;
  canDispute: boolean;
}

export interface CoachingRequests {
  asPlayer: CoachingRequest[];
  asCoach: CoachingRequest[];
}

export interface ProposalInput {
  /** ISO timestamp. */
  proposedStartAt: string;
  durationMinutes: number;
  proposedPrice: number;
  message: string;
}

export interface CoachProfileInput {
  game: GameSlug;
  specialties: string[];
  hourlyRate: number;
  bio: string;
  availability: string[];
}
