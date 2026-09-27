"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/lib/contracts";
import { usePreferenceLookups } from "../api";
import { findRole, rankLabel } from "../draft";
import { optionLabel, useOnboardingMessages } from "../messages";
import type { LookupOption, OnboardingDraft, OnboardingStep, RankOption } from "../types";

interface Row {
  label: string;
  value: string;
  step: OnboardingStep;
}

export function StepReview({
  draft,
  ranks,
  roles,
  linkedRiotId,
  steps,
  onEdit,
}: {
  draft: OnboardingDraft;
  ranks: RankOption[];
  roles: LookupOption[];
  linkedRiotId: string | null;
  /** Rows (and their edit buttons) exist only for steps in the wizard. */
  steps: OnboardingStep[];
  onEdit: (step: OnboardingStep) => void;
}) {
  const { t } = useOnboardingMessages();
  const lookups = usePreferenceLookups();
  const names = (ids: string[], options: LookupOption[] = []) =>
    ids.map((id) => optionLabel(t, options.find((option) => option.id === id) ?? { id, label: id })).join(", ");

  const { answers } = draft;
  const answered = [answers.voiceChat, answers.lossReaction, answers.mains.length > 0, answers.ageRange, answers.campus].filter(Boolean).length;
  const modes = draft.playModes.map((mode) => t(mode === "aram" ? "modeAram" : "modeRanked")).join(", ");
  const riotId = draft.riotId.trim();
  const link = draft.riotPick
    ? `${draft.riotPick.riotId} · ${t("reviewLinkPending")}`
    : riotId
      ? `${riotId} · ${t(riotId === linkedRiotId ? "reviewLinked" : "reviewSelfReported")}`
      : t("reviewSkipped");
  const rows: Row[] = [
    { label: t("reviewGame"), value: draft.game ? GAMES[draft.game].label : "", step: "game" },
    { label: t("reviewMode"), value: modes, step: "mode" },
    { label: t("reviewLink"), value: link, step: "link" },
    { label: t("reviewRank"), value: rankLabel(ranks, draft.rankTier, draft.rankLevel), step: "rank" },
    { label: t("reviewRole"), value: findRole(roles, draft.role)?.label ?? draft.role, step: "rank" },
    { label: t("reviewSchedule"), value: names(draft.schedule, lookups.data?.slots), step: "preferences" },
    { label: t("reviewGoals"), value: names(draft.goals, lookups.data?.goals), step: "preferences" },
    { label: t("reviewStyles"), value: names(draft.communicationStyles, lookups.data?.styles), step: "preferences" },
    { label: t("reviewRiot"), value: draft.riotId.trim() || t("reviewNone"), step: "riot" },
    { label: t("reviewPlaystyle"), value: answered ? t("reviewAnswered", { count: answered }) : t("reviewSkipped"), step: "questionnaire" },
  ];
  // The game row stays visible when the game is fixed by the URL, just without an edit button.
  const visible = rows.filter((row) => row.step === "game" || steps.includes(row.step));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t("reviewTitle")}</h2>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {visible.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-3 py-2.5">
            <dt className="w-24 shrink-0 text-sm text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 flex-1 text-sm font-medium break-words">{row.value}</dd>
            {steps.includes(row.step) && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`${t("edit")} ${row.label}`} onClick={() => onEdit(row.step)}>
                <Pencil />
              </Button>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
