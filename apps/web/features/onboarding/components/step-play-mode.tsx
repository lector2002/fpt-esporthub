"use client";

import { QueryState } from "@/components/common/query-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { GameSlug, PlayMode } from "@/lib/contracts";
import { usePlayModes } from "../api";
import { useOnboardingMessages } from "../messages";
import { MultiChoice } from "./choice-group";
import { StepSection } from "./step-section";

/** LoL only: Ranked and/or ARAM. At least one stays selected. */
export function StepPlayMode({
  game,
  value,
  onChange,
}: {
  game: GameSlug;
  value: PlayMode[];
  onChange: (playModes: PlayMode[]) => void;
}) {
  const { t } = useOnboardingMessages();
  const query = usePlayModes(game);

  return (
    <StepSection title={t("modeTitle")} description={t("pickAtLeast")}>
      <QueryState query={query} skeleton={<Skeleton className="h-12 w-full" />}>
        {(modes) => (
          <MultiChoice
            label={t("modeTitle")}
            choices={modes.map((mode) => ({ value: mode.id, label: t(mode.id === "aram" ? "modeAram" : "modeRanked") }))}
            value={value}
            onChange={(next) => next.length > 0 && onChange(next as PlayMode[])}
            className="sm:grid-cols-2"
          />
        )}
      </QueryState>
    </StepSection>
  );
}
