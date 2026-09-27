"use client";

import { isTeamMessageKey, useTeamMessages } from "./messages";
import type { LookupOption, RankOption } from "./types";

/** Distinct rank tiers in ladder order. Teams store a tier range ("Gold" - "Diamond"). */
export function rankTiers(options: RankOption[] | undefined): string[] {
  const tiers: string[] = [];
  for (const option of options ?? []) {
    if (!tiers.includes(option.tier)) tiers.push(option.tier);
  }
  return tiers;
}

export function tierIndex(tiers: string[], tier: string) {
  const wanted = tier.trim().toLowerCase();
  return tiers.findIndex((name) => name.toLowerCase() === wanted);
}

/** Matches a stored role (id or label, any case) to its lookup option. */
export function findRole(roles: LookupOption[] | undefined, value: string) {
  const wanted = value.trim().toLowerCase();
  return roles?.find((role) => role.id === wanted || role.label.toLowerCase() === wanted);
}

export function roleLabel(roles: LookupOption[] | undefined, value: string) {
  return findRole(roles, value)?.label ?? value;
}

/** Translated labels for schedule slots, goals and comm styles; falls back to the raw id. */
export function useTeamLabels() {
  const { t } = useTeamMessages();
  const translate = (prefix: string, id: string) => {
    const key = `${prefix}_${id}`;
    return isTeamMessageKey(key) ? t(key) : id;
  };
  return {
    slot: (id: string) => translate("slot", id),
    goal: (id: string) => translate("goal", id),
    comm: (id: string) => translate("comm", id),
  };
}
