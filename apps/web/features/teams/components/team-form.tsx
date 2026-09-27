"use client";

import { useState } from "react";
import { FormSection } from "@/components/common/form-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { GameSlug, PlayMode } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { useCommStyleOptions, useGoalOptions, useRankOptions, useRoleOptions } from "../api";
import { rankTiers, tierIndex, useTeamLabels } from "../labels";
import { useTeamMessages, type TeamMessageKey } from "../messages";
import {
  SCHEDULE_SLOTS,
  TEAM_DESCRIPTION_MAX,
  TEAM_MAX_GOALS,
  TEAM_NAME_MAX,
  TEAM_NAME_MIN,
  type TeamInput,
  type TeamSummary,
} from "../types";
import { TeamCard } from "./team-card";
import { ChipsField, SelectField } from "./team-form-fields";

export type TeamFormValues = Omit<TeamInput, "game">;

export const EMPTY_TEAM_FORM: TeamFormValues = {
  name: "",
  mode: "ranked",
  description: "",
  rankMin: "",
  rankMax: "",
  neededRoles: [],
  schedule: [],
  goals: [],
  communicationStyle: "",
  recruitmentOpen: true,
};

type FormErrors = Partial<Record<keyof TeamFormValues, TeamMessageKey>>;
type FieldSetter = <K extends keyof TeamFormValues>(key: K) => (value: TeamFormValues[K]) => void;

function validate(values: TeamFormValues, tiers: string[]): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  if (name.length < TEAM_NAME_MIN || name.length > TEAM_NAME_MAX) errors.name = "nameLength";
  if (values.description.length > TEAM_DESCRIPTION_MAX) errors.description = "descriptionLength";
  // ARAM teams have no rank range; the API stores the full ladder.
  if (values.mode !== "aram") {
    if (!values.rankMin) errors.rankMin = "rankRequired";
    if (!values.rankMax) errors.rankMax = "rankRequired";
    if (values.rankMin && values.rankMax && tierIndex(tiers, values.rankMin) > tierIndex(tiers, values.rankMax)) {
      errors.rankMax = "rankOrder";
    }
  }
  if (values.schedule.length === 0) errors.schedule = "scheduleRequired";
  if (values.goals.length === 0 || values.goals.length > TEAM_MAX_GOALS) errors.goals = "goalsRange";
  if (!values.communicationStyle) errors.communicationStyle = "commRequired";
  return errors;
}

/** The team card players will see, rebuilt from the form as it is filled in. */
function usePreview(game: GameSlug, values: TeamFormValues, base: TeamSummary | undefined, fallbackName: string): TeamSummary | null {
  const { user } = useSession();
  if (!user) return null;
  const now = new Date().toISOString();
  return {
    id: base?.id ?? "preview",
    name: values.name.trim() || fallbackName,
    logoKey: base?.logoKey ?? null,
    coverKey: base?.coverKey ?? null,
    featuredUntil: base?.featuredUntil ?? null,
    game,
    mode: values.mode,
    description: values.description.trim() || null,
    rankMin: values.rankMin,
    rankMax: values.rankMax,
    neededRoles: values.neededRoles,
    schedule: values.schedule,
    goals: values.goals,
    communicationStyle: values.communicationStyle,
    recruitmentOpen: values.recruitmentOpen,
    memberCount: base?.memberCount ?? 1,
    maxMembers: base?.maxMembers ?? 5,
    captain: base?.captain ?? { id: user.id, displayName: user.displayName },
    viewerMembership: "captain",
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Form on the left; a sticky column with the live team card, `aside` (e.g. pictures), recruitment and save. */
export function TeamForm({
  game,
  initialValues,
  submitLabel,
  pending,
  onSubmit,
  base,
  aside,
}: {
  game: GameSlug;
  initialValues: TeamFormValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: TeamFormValues) => void;
  /** The saved team when editing, for its pictures and member count in the preview. */
  base?: TeamSummary;
  aside?: React.ReactNode;
}) {
  const { t } = useTeamMessages();
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const tiers = rankTiers(useRankOptions(game).data);

  const errors = submitted ? validate(values, tiers) : {};
  const error = (key: keyof TeamFormValues) => (errors[key] ? t(errors[key]) : undefined);
  const set: FieldSetter = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));
  const preview = usePreview(game, values, base, t("namePreview"));
  const roles = useRoleOptions(game).data;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values, tiers)).length > 0) return;
    onSubmit({ ...values, name: values.name.trim(), description: values.description.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <FormSection title={t("sectionBasics")}>
          <Field data-invalid={Boolean(error("name"))}>
            <FieldLabel htmlFor="team-name">{t("name")}</FieldLabel>
            <Input
              id="team-name"
              value={values.name}
              maxLength={TEAM_NAME_MAX}
              aria-invalid={Boolean(error("name"))}
              onChange={(event) => set("name")(event.target.value)}
            />
            {error("name") && <FieldError>{error("name")}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(error("description"))}>
            <FieldLabel htmlFor="team-description">{t("description")}</FieldLabel>
            <Textarea
              id="team-description"
              rows={4}
              value={values.description}
              aria-invalid={Boolean(error("description"))}
              onChange={(event) => set("description")(event.target.value)}
            />
            <FieldDescription>
              {t("charCount", { count: values.description.length, max: TEAM_DESCRIPTION_MAX })}
            </FieldDescription>
            {error("description") && <FieldError>{error("description")}</FieldError>}
          </Field>
        </FormSection>
        <TeamPreferenceFields game={game} values={values} set={set} error={error} />
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <p className="text-sm font-medium text-muted-foreground">{t("previewTitle")}</p>
        {preview && (
          <div inert data-testid="team-preview">
            <TeamCard team={preview} roles={roles} />
          </div>
        )}
        {aside}
        <Card size="sm">
          <CardContent>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="team-recruitment">{t("openRecruitmentNow")}</FieldLabel>
              </FieldContent>
              <Switch id="team-recruitment" checked={values.recruitmentOpen} onCheckedChange={set("recruitmentOpen")} />
            </Field>
          </CardContent>
        </Card>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />} {submitLabel}
        </Button>
      </aside>
    </form>
  );
}

/** Rank range, roles, schedule, goals and comm style, with options from the lookups API. */
function TeamPreferenceFields({
  game,
  values,
  set,
  error,
}: {
  game: GameSlug;
  values: TeamFormValues;
  set: FieldSetter;
  error: (key: keyof TeamFormValues) => string | undefined;
}) {
  const { t } = useTeamMessages();
  const labels = useTeamLabels();
  const tierOptions = rankTiers(useRankOptions(game).data).map((tier) => ({ id: tier, label: tier }));
  const roles = useRoleOptions(game).data ?? [];
  const goals = (useGoalOptions().data ?? []).map((goal) => ({ id: goal.id, label: labels.goal(goal.id) }));
  const styles = (useCommStyleOptions().data ?? []).map((style) => ({ id: style.id, label: labels.comm(style.id) }));
  const slotOptions = SCHEDULE_SLOTS.map((slot) => ({ id: slot, label: labels.slot(slot) }));
  const aram = values.mode === "aram";

  return (
    <>
      <FormSection title={t("sectionLineup")}>
        {game === "league_of_legends" && <ModeField value={values.mode} onChange={set("mode")} />}
        {!aram && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="team-rank-min"
              label={t("rankMin")}
              placeholder={t("selectRank")}
              options={tierOptions}
              value={values.rankMin}
              onChange={set("rankMin")}
              error={error("rankMin")}
            />
            <SelectField
              id="team-rank-max"
              label={t("rankMax")}
              placeholder={t("selectRank")}
              options={tierOptions}
              value={values.rankMax}
              onChange={set("rankMax")}
              error={error("rankMax")}
            />
          </div>
        )}
        {!aram && <ChipsField legend={t("neededRoles")} options={roles} value={values.neededRoles} onChange={set("neededRoles")} />}
      </FormSection>
      <FormSection title={t("sectionPlay")}>
        <ChipsField
          legend={t("schedule")}
          options={slotOptions}
          value={values.schedule}
          onChange={set("schedule")}
          error={error("schedule")}
        />
        <ChipsField
          legend={t("goals")}
          hint={t("goalsHint")}
          options={goals}
          value={values.goals}
          onChange={set("goals")}
          error={error("goals")}
          max={TEAM_MAX_GOALS}
        />
        <SelectField
          id="team-comm-style"
          label={t("commStyle")}
          placeholder={t("selectStyle")}
          options={styles}
          value={values.communicationStyle}
          onChange={set("communicationStyle")}
          error={error("communicationStyle")}
        />
      </FormSection>
    </>
  );
}

/** LoL only: ranked teams have a rank range and needed roles, ARAM teams do not. */
function ModeField({ value, onChange }: { value: PlayMode; onChange: (mode: PlayMode) => void }) {
  const { t } = useTeamMessages();
  return (
    <Field>
      <FieldLabel id="team-mode-label">{t("mode")}</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-labelledby="team-mode-label"
        value={value}
        onValueChange={(next) => next && onChange(next as PlayMode)}
        className="justify-start"
      >
        <ToggleGroupItem value="ranked" className="data-[state=on]:text-primary">
          {t("mode_ranked")}
        </ToggleGroupItem>
        <ToggleGroupItem value="aram" className="data-[state=on]:text-primary">
          {t("mode_aram")}
        </ToggleGroupItem>
      </ToggleGroup>
    </Field>
  );
}
