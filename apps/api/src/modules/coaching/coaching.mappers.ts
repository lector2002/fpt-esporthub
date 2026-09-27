import type { GameId } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";
import { EQUIPPED_SELECT, toCosmeticsView } from "../cosmetics/catalog";
import { DISPUTE_WINDOW_MS, sessionEnd } from "./coaching-settlement.service";

/** Include for a coach profile with everything the summary needs. */
export function coachInclude(now: Date) {
  return {
    user: {
      select: {
        id: true,
        displayName: true,
        reputationBadge: true,
        avatarKey: true,
        coverKey: true,
        ...EQUIPPED_SELECT,
        profiles: { select: { game: true, rankTier: true, rankLevel: true, role: true, verificationStatus: true, mains: true, recentChampion: true } },
      },
    },
    feedbacks: { select: { rating: true } },
    _count: { select: { requests: { where: { status: "AGREED" as const, proposedStartAt: { lt: now } } } } },
  };
}

interface CoachRecord {
  id: string;
  userId: string;
  game: GameId;
  specialties: string[];
  hourlyRate: number;
  bio: string;
  availability: string[];
  active: boolean;
  reviewStatus: string;
  user: {
    displayName: string;
    reputationBadge: string;
    avatarKey: string | null;
    coverKey: string | null;
    frameId: string | null;
    bannerId: string | null;
    nameColorId: string | null;
    titleId: string | null;
    profiles: { game: GameId; rankTier: string; rankLevel: number | null; role: string; verificationStatus: string; mains: string[]; recentChampion: string | null }[];
  };
  feedbacks: { rating: number }[];
  _count: { requests: number };
}

export function toCoachSummary(coach: CoachRecord) {
  const profile = coach.user.profiles.find((item) => item.game === coach.game) ?? null;
  const ratings = coach.feedbacks.map((item) => item.rating);
  const avgRating = ratings.length ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10 : null;
  return {
    id: coach.id,
    userId: coach.userId,
    displayName: coach.user.displayName,
    reputationBadge: coach.user.reputationBadge,
    avatarKey: coach.user.avatarKey,
    coverKey: coach.user.coverKey,
    cosmetics: toCosmeticsView(coach.user),
    mains: profile?.mains ?? [],
    recentChampion: profile?.recentChampion ?? null,
    game: toGameSlug(coach.game),
    rankTier: profile?.rankTier ?? null,
    rankLevel: profile?.rankLevel ?? null,
    role: profile?.role ?? null,
    verificationStatus: profile?.verificationStatus ?? "UNVERIFIED",
    specialties: coach.specialties,
    hourlyRate: coach.hourlyRate,
    bio: coach.bio,
    availability: coach.availability,
    active: coach.active,
    reviewStatus: coach.reviewStatus,
    avgRating,
    reviewCount: ratings.length,
    completedSessions: coach._count.requests,
  };
}

export type CoachingRequestStatus = "PENDING" | "COUNTERED" | "AGREED" | "DECLINED" | "CANCELLED";

interface NegotiationState {
  status: CoachingRequestStatus;
  lastProposedById: string;
  proposedStartAt: Date;
  coach: { userId: string };
}

/**
 * Who may do what on a request. Used both for the list flags and to guard mutations.
 * The party who did not make the last proposal responds (counter/agree); the coach declines open requests;
 * the player withdraws open requests anytime; either side cancels an agreed session before it starts.
 */
export function computeActions(request: NegotiationState, userId: string, now: Date) {
  const open = request.status === "PENDING" || request.status === "COUNTERED";
  const upcoming = request.proposedStartAt > now;
  const myTurn = request.lastProposedById !== userId;
  const isCoach = request.coach.userId === userId;
  return {
    canCounter: open && myTurn,
    canAgree: open && myTurn && upcoming,
    canDecline: open && isCoach,
    canCancel: (open && !isCoach) || (request.status === "AGREED" && upcoming),
  };
}

interface RequestRecord extends NegotiationState {
  id: string;
  creditHold: number | null;
  settlement: "HELD" | "RELEASED" | "REFUNDED" | "DISPUTED" | null;
  coachId: string;
  playerId: string;
  durationMinutes: number;
  proposedPrice: number;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  coach: { userId: string; game: GameId; hourlyRate: number; user: { id: string; displayName: string } };
  player: { id: string; displayName: string };
}

export function toRequestView(request: RequestRecord, userId: string, now: Date) {
  const isCoach = request.coach.userId === userId;
  const counterpart = isCoach ? request.player : request.coach.user;
  return {
    id: request.id,
    coachId: request.coachId,
    game: toGameSlug(request.coach.game),
    coachHourlyRate: request.coach.hourlyRate,
    viewerRole: isCoach ? ("coach" as const) : ("player" as const),
    counterpart: { id: counterpart.id, displayName: counterpart.displayName },
    status: request.status,
    proposedStartAt: request.proposedStartAt,
    durationMinutes: request.durationMinutes,
    proposedPrice: request.proposedPrice,
    message: request.message,
    lastProposedByMe: request.lastProposedById === userId,
    creditHold: request.creditHold,
    settlement: request.settlement,
    ...settlementActions(request, isCoach, now),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    ...computeActions(request, userId, now),
  };
}

/** Player only, once a credit-paid session has started and before the coach is paid. */
function settlementActions(request: RequestRecord, isCoach: boolean, now: Date) {
  const started = request.proposedStartAt <= now;
  const open =
    !isCoach && request.status === "AGREED" && request.settlement === "HELD" && started && now.getTime() < sessionEnd(request).getTime() + DISPUTE_WINDOW_MS;
  return { canConfirm: open, canDispute: open };
}
