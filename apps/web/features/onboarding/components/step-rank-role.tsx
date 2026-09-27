"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { QueryState } from "@/components/common/query-state";
import { Skeleton } from "@/components/ui/skeleton";
import { findRole, groupTiers } from "../draft";
import { useOnboardingMessages } from "../messages";
import type { LookupOption, OnboardingDraft, RankOption } from "../types";
import { SingleChoice } from "./choice-group";
import { StepSection } from "./step-section";

type Patch = (patch: Partial<OnboardingDraft>) => void;

const choicesSkeleton = <Skeleton className="h-32 w-full" />;

export function StepRankRole({
  draft,
  ranksQuery,
  rolesQuery,
  onChange,
}: {
  draft: OnboardingDraft;
  ranksQuery: UseQueryResult<RankOption[]>;
  rolesQuery: UseQueryResult<LookupOption[]>;
  onChange: Patch;
}) {
  const { t } = useOnboardingMessages();
  return (
    <div className="flex flex-col gap-8">
      {draft.riotPick?.ranked.solo && <p className="text-sm text-muted-foreground">{t("rankFromRiot")}</p>}
      <QueryState query={ranksQuery} skeleton={choicesSkeleton}>
        {(ranks) => <RankPicker ranks={ranks} draft={draft} onChange={onChange} />}
      </QueryState>
      <StepSection title={t("roleTitle")}>
        <QueryState query={rolesQuery} skeleton={choicesSkeleton}>
          {(roles) => (
            <SingleChoice
              label={t("roleTitle")}
              choices={roles.map((role) => ({ value: role.id, label: role.label }))}
              value={findRole(roles, draft.role)?.id ?? ""}
              onChange={(role) => onChange({ role })}
            />
          )}
        </QueryState>
      </StepSection>
    </div>
  );
}

function RankPicker({ ranks, draft, onChange }: { ranks: RankOption[]; draft: OnboardingDraft; onChange: Patch }) {
  const { t } = useOnboardingMessages();
  const tiers = groupTiers(ranks);
  const divisions = tiers.find((entry) => entry.tier === draft.rankTier)?.divisions ?? [];

  const selectTier = (tier: string) => {
    const next = tiers.find((entry) => entry.tier === tier)?.divisions ?? [];
    const keepLevel = next.some((division) => division.level === draft.rankLevel);
    onChange({ rankTier: tier, rankLevel: next.length === 0 ? null : keepLevel ? draft.rankLevel : null });
  };

  return (
    <StepSection title={t("rankTitle")}>
      <SingleChoice
        label={t("rankTier")}
        choices={tiers.map((entry) => ({ value: entry.tier, label: entry.tier }))}
        value={draft.rankTier}
        onChange={selectTier}
        className="grid-cols-3 sm:grid-cols-4"
      />
      {divisions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("rankLevel")}</p>
          <SingleChoice
            label={t("rankLevel")}
            choices={divisions.map((division) => ({
              value: String(division.level),
              label: division.label.replace(division.tier, "").trim() || division.label,
            }))}
            value={draft.rankLevel === null ? "" : String(draft.rankLevel)}
            onChange={(level) => onChange({ rankLevel: Number(level) })}
            className="grid-cols-4 sm:grid-cols-4"
          />
        </div>
      )}
    </StepSection>
  );
}
