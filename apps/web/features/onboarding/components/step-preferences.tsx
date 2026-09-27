"use client";

import { useEffect } from "react";
import { QueryState } from "@/components/common/query-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferenceLookups } from "../api";
import { MAX_GOALS, MAX_STYLES } from "../draft";
import { optionLabel, useOnboardingMessages } from "../messages";
import type { LookupOption, OnboardingDraft } from "../types";
import { MultiChoice } from "./choice-group";
import { StepSection } from "./step-section";

export function StepPreferences({ draft, onChange }: { draft: OnboardingDraft; onChange: (patch: Partial<OnboardingDraft>) => void }) {
  const { t } = useOnboardingMessages();
  const lookups = usePreferenceLookups();
  const toChoices = (options: LookupOption[]) => options.map((option) => ({ value: option.id, label: optionLabel(t, option) }));
  const counter = (count: number, max: number) => t("selectedCount", { count, max });

  // Prefilled profiles may hold ids that are no longer offered; drop them so they can't block saving.
  useEffect(() => {
    if (!lookups.data) return;
    const { slots, goals, styles } = lookups.data;
    const keep = (ids: string[], options: LookupOption[]) => ids.filter((id) => options.some((option) => option.id === id));
    const pruned = {
      schedule: keep(draft.schedule, slots),
      goals: keep(draft.goals, goals),
      communicationStyles: keep(draft.communicationStyles, styles),
    };
    const changed = (Object.keys(pruned) as (keyof typeof pruned)[]).some((key) => pruned[key].length !== draft[key].length);
    if (changed) onChange(pruned);
  }, [lookups.data, draft, onChange]);

  return (
    <QueryState query={lookups} skeleton={<Skeleton className="h-72 w-full" />}>
      {({ slots, goals, styles }) => (
        <div className="flex flex-col gap-8">
          <StepSection title={t("scheduleTitle")} description={t("pickAtLeast")}>
            <MultiChoice
              label={t("scheduleTitle")}
              choices={toChoices(slots)}
              value={draft.schedule}
              onChange={(schedule) => onChange({ schedule })}
            />
          </StepSection>
          <StepSection title={t("goalsTitle")} description={t("pickUpTo", { max: MAX_GOALS })} aside={counter(draft.goals.length, MAX_GOALS)}>
            <MultiChoice
              label={t("goalsTitle")}
              choices={toChoices(goals)}
              value={draft.goals}
              max={MAX_GOALS}
              onChange={(next) => onChange({ goals: next })}
            />
          </StepSection>
          <StepSection
            title={t("stylesTitle")}
            description={t("pickUpTo", { max: MAX_STYLES })}
            aside={counter(draft.communicationStyles.length, MAX_STYLES)}
          >
            <MultiChoice
              label={t("stylesTitle")}
              choices={toChoices(styles)}
              value={draft.communicationStyles}
              max={MAX_STYLES}
              onChange={(communicationStyles) => onChange({ communicationStyles })}
            />
          </StepSection>
        </div>
      )}
    </QueryState>
  );
}
