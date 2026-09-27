import type { GameId } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";
import { FILL_ROLE, UNRANKED_TIER, gameRanks } from "../lookups/lookup-data";

export type Weights = Record<keyof ScoreParts, number>;

export const WEIGHTS: Weights = {
  rank: 0.3,
  role: 0.2,
  schedule: 0.2,
  goals: 0.15,
  communication: 0.1,
  reputation: 0.05,
};

/** ARAM ignores rank and role; reputation keeps a small weight so trust still counts. */
export const ARAM_WEIGHTS: Weights = {
  rank: 0,
  role: 0,
  schedule: 0.4,
  goals: 0.3,
  communication: 0.2,
  reputation: 0.1,
};

export type ReasonCode =
  | "similar_rank"
  | "role_fit"
  | "schedule_overlap"
  | "shared_goals"
  | "comm_fit"
  | "high_reputation"
  | "same_campus";

export interface ScoreParts {
  rank: number;
  role: number;
  schedule: number;
  goals: number;
  communication: number;
  reputation: number;
}

function ranksFor(game: GameId) {
  return gameRanks[toGameSlug(game)] ?? [];
}

function maxSortFor(game: GameId) {
  return ranksFor(game).reduce((max, rank) => Math.max(max, rank.sort), 1);
}

export function getRankSort(game: GameId, tier: string, level: number | null): number {
  const match = ranksFor(game).find((r) => r.tier === tier && r.level === level);
  return match?.sort ?? 0;
}

/** Lowest and highest sort values of a tier ("Gold" covers Gold 1-3). */
function tierBounds(game: GameId, tier: string) {
  const sorts = ranksFor(game).filter((r) => r.tier === tier).map((r) => r.sort);
  if (sorts.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...sorts), max: Math.max(...sorts) };
}

const isUnranked = (tier: string) => tier === UNRANKED_TIER;
const isFill = (role: string) => role.toLowerCase() === FILL_ROLE.toLowerCase();

/** Unranked is a category, not a distance: it only matches another Unranked player. */
export function rankCompatibility(
  game: GameId,
  aTier: string,
  aLevel: number | null,
  bTier: string,
  bLevel: number | null,
): number {
  if (isUnranked(aTier) || isUnranked(bTier)) return isUnranked(aTier) && isUnranked(bTier) ? 1 : 0;
  const diff = Math.abs(getRankSort(game, aTier, aLevel) - getRankSort(game, bTier, bLevel));
  const maxDiff = maxSortFor(game) - 1;
  if (maxDiff <= 0) return 1;
  return Math.max(0, 1 - diff / maxDiff);
}

export function rankRangeCompatibility(
  game: GameId,
  tier: string,
  level: number | null,
  rankMin: string,
  rankMax: string,
): number {
  // An Unranked player fits only a range that starts at Unranked.
  if (isUnranked(tier)) return isUnranked(rankMin) ? 1 : 0;
  const sort = getRankSort(game, tier, level);
  const min = tierBounds(game, rankMin).min;
  const max = tierBounds(game, rankMax).max;
  if (sort >= min && sort <= max) return 1;
  const dist = sort < min ? min - sort : sort - max;
  return Math.max(0, 1 - dist / maxSortFor(game));
}

/** Fill fits any needed team role. */
export function roleCompatibility(aRole: string, bRoles: string[], team = false): number {
  if (bRoles.length === 0) return 0.5;
  if (isFill(aRole)) return team ? 1 : 0.5;
  if (bRoles.some(isFill)) return team ? 1 : 0.5;
  const match = bRoles.some((r) => r.toLowerCase() === aRole.toLowerCase());
  return match ? 1 : 0;
}

/** Duo partners fit when their roles differ; Fill stays neutral (0.5, no role_fit reason). */
export function playerRoleFit(aRole: string, bRole: string): number {
  if (isFill(aRole) || isFill(bRole)) return 0.5;
  return aRole.toLowerCase() === bRole.toLowerCase() ? 0 : 1;
}

/** Share of the caller's picks (`a`) the other side also has, so a more flexible partner is never penalised. */
function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b.map((s) => s.toLowerCase()));
  const overlap = a.filter((s) => bSet.has(s.toLowerCase())).length;
  return overlap / a.length;
}

export const scheduleOverlap = overlapRatio;
export const goalOverlap = overlapRatio;

export function communicationCompatibility(aStyles: string[], bStyles: string[]): number {
  return overlapRatio(aStyles, bStyles) > 0 ? 1 : 0;
}

/** Communication inputs of a player: styles plus the optional questionnaire answers. */
export interface FitInput {
  styles: string[];
  voiceChat: string | null;
  lossReaction: string | null;
  ageRange: string | null;
  campus: string | null;
}

const VOICE_SCALE = ["always", "sometimes", "text_only"];
const AGE_SCALE = ["under_18", "18_21", "22_25", "over_25"];

/** 1 for the same answer, 0.5 for neighbours, 0 further apart; null when either answer is off the scale. */
function scaleFit(scale: string[], a: string, b: string): number | null {
  const [i, j] = [scale.indexOf(a), scale.indexOf(b)];
  if (i < 0 || j < 0) return null;
  return [1, 0.5][Math.abs(i - j)] ?? 0;
}

function lossReactionFit(a: string, b: string): number {
  if (a === "calm" && b === "calm") return 1;
  return a === "calm" || b === "calm" ? 0.75 : 0.5;
}

export function sameCampus(a: string | null, b: string | null): boolean {
  return Boolean(a && a !== "other" && a === b);
}

/**
 * Style overlap averaged with every questionnaire answer both players gave.
 * A shared campus only adds (online play doesn't need one); unanswered questions are skipped.
 */
export function communicationFit(a: FitInput, b: FitInput): number {
  const parts: (number | null)[] = [communicationCompatibility(a.styles, b.styles)];
  if (a.voiceChat && b.voiceChat) parts.push(scaleFit(VOICE_SCALE, a.voiceChat, b.voiceChat));
  if (a.lossReaction && b.lossReaction) parts.push(lossReactionFit(a.lossReaction, b.lossReaction));
  if (a.ageRange && b.ageRange) parts.push(scaleFit(AGE_SCALE, a.ageRange, b.ageRange));
  if (sameCampus(a.campus, b.campus)) parts.push(1);
  const scored = parts.filter((part) => part !== null);
  return scored.reduce((sum, part) => sum + part, 0) / scored.length;
}

export function reputationScore(badge: string, verification: string): number {
  const base: Record<string, number> = { TRUSTED: 1, VERIFIED: 0.8, CAUTION: 0.2 };
  const score = base[badge] ?? 0.4;
  return verification === "VERIFIED" ? Math.min(1, score + 0.2) : score;
}

export function totalScore(scores: ScoreParts, weights: Weights = WEIGHTS): number {
  const parts = Object.keys(weights) as (keyof ScoreParts)[];
  const total = parts.reduce((sum, part) => sum + scores[part] * weights[part], 0);
  return Math.round(total * 100);
}

const REASON_RULES: { part: keyof ScoreParts; min: number; code: ReasonCode }[] = [
  { part: "rank", min: 0.7, code: "similar_rank" },
  { part: "role", min: 0.9, code: "role_fit" },
  { part: "schedule", min: 0.5, code: "schedule_overlap" },
  { part: "goals", min: 0.5, code: "shared_goals" },
  { part: "communication", min: 0.9, code: "comm_fit" },
  { part: "reputation", min: 0.8, code: "high_reputation" },
];

/** Up to 3 stable reason codes, `extra` first; parts with zero weight (ARAM rank/role) never produce one. */
export function buildReasons(scores: ScoreParts, weights: Weights = WEIGHTS, extra: ReasonCode[] = []): ReasonCode[] {
  const fromScores = REASON_RULES.filter((rule) => weights[rule.part] > 0 && scores[rule.part] >= rule.min).map((rule) => rule.code);
  return [...extra, ...fromScores].slice(0, 3);
}
