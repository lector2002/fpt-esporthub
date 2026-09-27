import { BadRequestException } from "@nestjs/common";
import type { GameId } from "@fpt-esporthub/database";
import { toGameSlug } from "../../common/game";
import {
  PLAY_MODE_IDS,
  communicationStyles,
  gameRanks,
  gameRoles,
  playerGoals,
  scheduleSlots,
  type PlayMode,
} from "../lookups/lookup-data";

export const TEAM_MAX_MEMBERS = 5;
export const TEAM_MAX_GOALS = 2;
export const SCHEDULE_SLOTS = scheduleSlots.map((slot) => slot.id);

/** Rank tiers of a game in ascending order ("Iron", "Bronze", ...). Teams store tiers, not divisions. */
export function rankTiers(game: GameId): string[] {
  const tiers: string[] = [];
  for (const rank of gameRanks[toGameSlug(game)] ?? []) {
    if (!tiers.includes(rank.tier)) tiers.push(rank.tier);
  }
  return tiers;
}

/** Index of a tier in the game's ladder, case-insensitive; -1 when unknown. */
export function tierIndex(game: GameId, tier: string): number {
  const wanted = tier.trim().toLowerCase();
  return rankTiers(game).findIndex((name) => name.toLowerCase() === wanted);
}

export function normalizeRankRange(game: GameId, rankMin: string, rankMax: string) {
  const tiers = rankTiers(game);
  const min = tierIndex(game, rankMin);
  const max = tierIndex(game, rankMax);
  if (min < 0 || max < 0) throw new BadRequestException("Unknown rank for this game");
  if (min > max) throw new BadRequestException("Minimum rank must not be above maximum rank");
  return { rankMin: tiers[min], rankMax: tiers[max] };
}

/** Accepts role ids or labels in any case; returns unique labels, the stored form for all roles. */
export function normalizeRoles(game: GameId, roles: string[]): string[] {
  const options = gameRoles[toGameSlug(game)] ?? [];
  const ids = roles.map((role) => {
    const wanted = role.trim().toLowerCase();
    const match = options.find((option) => option.id === wanted || option.label.toLowerCase() === wanted);
    if (!match) throw new BadRequestException("Unknown role for this game");
    return match.label;
  });
  return [...new Set(ids)];
}

/** LoL teams are "ranked" or "aram"; every other game is always "ranked". Unknown values are rejected. */
export function resolveTeamMode(game: GameId, requested: string | undefined, current = "ranked"): PlayMode {
  if (requested !== undefined && !PLAY_MODE_IDS.includes(requested as PlayMode)) {
    throw new BadRequestException("Unknown team mode");
  }
  if (game !== "LEAGUE_OF_LEGENDS") return "ranked";
  return (requested ?? current) as PlayMode;
}

type RankFields = { rankMin?: string; rankMax?: string; neededRoles?: string[] };

/**
 * Mode, rank range and needed roles. ARAM teams store the full ladder (Unranked..Challenger) and no roles,
 * so the required columns stay valid while matching and filters ignore them.
 */
export function modeFields(game: GameId, mode: PlayMode, input: RankFields, current?: Required<RankFields>) {
  if (mode === "aram") {
    const tiers = rankTiers(game);
    return { mode, rankMin: tiers[0], rankMax: tiers[tiers.length - 1], neededRoles: [] };
  }
  const rankMin = input.rankMin ?? current?.rankMin;
  const rankMax = input.rankMax ?? current?.rankMax;
  if (!rankMin || !rankMax) throw new BadRequestException("Rank range is required");
  const neededRoles = normalizeRoles(game, input.neededRoles ?? current?.neededRoles ?? []);
  return { mode, ...normalizeRankRange(game, rankMin, rankMax), neededRoles };
}

export function roleMatches(role: string, wanted: string) {
  return role.trim().toLowerCase() === wanted.trim().toLowerCase();
}

export function validateGoals(goals: string[]) {
  const unique = [...new Set(goals)];
  if (unique.length > TEAM_MAX_GOALS) throw new BadRequestException(`Pick at most ${TEAM_MAX_GOALS} goals`);
  if (unique.some((goal) => !playerGoals.some((option) => option.id === goal))) {
    throw new BadRequestException("Unknown goal");
  }
  return unique;
}

export function validateCommunicationStyle(style: string) {
  if (!communicationStyles.some((option) => option.id === style)) {
    throw new BadRequestException("Unknown communication style");
  }
  return style;
}
