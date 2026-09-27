import { matchesQuery } from "@/components/common/browse";
import { ALL, type MatchFilters, type MatchResult } from "./types";

export const MIN_SCORE_OPTIONS = [0, 50, 70, 85] as const;

// Both games' tiers, low to high; unknown tiers sort last.
const TIER_ORDER = ["Unranked", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Ascendant", "Immortal", "Master", "Grandmaster", "Challenger", "Radiant"];
const tierRank = (tier: string) => (TIER_ORDER.includes(tier) ? TIER_ORDER.indexOf(tier) : TIER_ORDER.length);

function rolesOf(match: MatchResult) {
  return match.type === "player" ? [match.role] : match.neededRoles;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/** Filter options come from the results themselves, so every option matches at least one card. */
export function filterOptions(matches: MatchResult[]) {
  return {
    roles: uniqueSorted(matches.flatMap(rolesOf)),
    slots: uniqueSorted(matches.flatMap((match) => match.schedule)),
    ranks: [...new Set(matches.flatMap((match) => (match.type === "player" ? [match.rankTier] : [])))].sort((a, b) => tierRank(a) - tierRank(b)),
  };
}

/** Name search: a player's name, or a team's name and captain. */
export function matchesSearch(match: MatchResult, query: string) {
  return match.type === "player" ? matchesQuery(query, match.displayName) : matchesQuery(query, match.name, match.captainName);
}

export function applyFilters(matches: MatchResult[], filters: MatchFilters) {
  return matches.filter((match) => {
    if (match.score < filters.minScore) return false;
    if (filters.rank !== ALL && (match.type !== "player" || match.rankTier !== filters.rank)) return false;
    if (filters.role !== ALL && !rolesOf(match).some((role) => role.toLowerCase() === filters.role.toLowerCase())) {
      return false;
    }
    return filters.slot === ALL || match.schedule.includes(filters.slot);
  });
}

export function activeFilterCount(filters: MatchFilters) {
  return Number(filters.role !== ALL) + Number(filters.minScore > 0) + Number(filters.slot !== ALL) + Number(filters.rank !== ALL);
}

/** Token color for a match score band. */
export function scoreTone(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-primary";
  return "text-muted-foreground";
}
