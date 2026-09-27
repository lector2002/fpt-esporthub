"use client";

import { FilterSelect } from "@/components/common/browse";
import { MIN_SCORE_OPTIONS } from "../filters";
import { slotLabel, useMatchingMessages } from "../messages";
import { ALL, type MatchFilters } from "../types";

interface MatchFilterFieldsProps {
  idPrefix: string;
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  /** Omitted in ARAM mode, which has no role fit. */
  roles?: string[];
  slots: string[];
  /** Omitted for teams, whose rank is a range. */
  ranks?: string[];
}

/** Filter fields for the Find Match toolbar; options come from the results so every choice matches a card. */
export function MatchFilterFields({ idPrefix, filters, onChange, roles, slots, ranks }: MatchFilterFieldsProps) {
  const { t } = useMatchingMessages();
  const set = (patch: Partial<MatchFilters>) => onChange({ ...filters, ...patch });

  return (
    <>
      {roles && (
        <FilterSelect
          id={`${idPrefix}-role`}
          label={t("role")}
          value={filters.role}
          onChange={(role) => set({ role })}
          options={[{ value: ALL, label: t("any") }, ...roles.map((role) => ({ value: role, label: role }))]}
        />
      )}
      {ranks && ranks.length > 0 && (
        <FilterSelect
          id={`${idPrefix}-rank`}
          label={t("rank")}
          value={filters.rank}
          onChange={(rank) => set({ rank })}
          options={[{ value: ALL, label: t("any") }, ...ranks.map((rank) => ({ value: rank, label: rank }))]}
        />
      )}
      <FilterSelect
        id={`${idPrefix}-score`}
        label={t("minScore")}
        value={String(filters.minScore)}
        onChange={(value) => set({ minScore: Number(value) })}
        options={MIN_SCORE_OPTIONS.map((score) => ({
          value: String(score),
          label: score === 0 ? t("anyScore") : `${score}%+`,
        }))}
      />
      <FilterSelect
        id={`${idPrefix}-slot`}
        label={t("slot")}
        value={filters.slot}
        onChange={(slot) => set({ slot })}
        options={[{ value: ALL, label: t("any") }, ...slots.map((slot) => ({ value: slot, label: slotLabel(t, slot) }))]}
      />
    </>
  );
}
