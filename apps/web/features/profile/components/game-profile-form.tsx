"use client";

import { useState } from "react";
import { ErrorState } from "@/components/common/query-state";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { isAramOnly, type GameSlug, type PlayMode, type PlayerProfile } from "@/lib/contracts";
import {
  useGoalOptions,
  usePlayModeOptions,
  useRankOptions,
  useRoleOptions,
  useScheduleOptions,
  useStyleOptions,
} from "../api";
import { useOptionLabel, useProfileMessages } from "../messages";
import type { LookupOption, RankOption } from "../types";
import { useDraft } from "./profile-draft";
import { ChipSelect } from "./profile-section";

const rankKey = (tier: string, level: number | null) => `${tier}:${level ?? ""}`;

/** Drop legacy values that are no longer valid lookup ids (the API rejects them). */
const findRoleLabel = (roles: LookupOption[], value: string) =>
  roles.find((role) => [role.id, role.label.toLowerCase()].includes(value.toLowerCase()))?.label ?? "";

const known = (values: string[], options: LookupOption[]) => values.filter((value) => options.some((option) => option.id === value));

interface Options {
  playModes: LookupOption[];
  ranks: RankOption[];
  roles: LookupOption[];
  schedules: LookupOption[];
  goals: LookupOption[];
  styles: LookupOption[];
}

export function GameProfileSection({ profile, game }: { profile: PlayerProfile; game: GameSlug }) {
  const queries = [
    usePlayModeOptions(game),
    useRankOptions(game),
    useRoleOptions(game),
    useScheduleOptions(),
    useGoalOptions(),
    useStyleOptions(),
  ] as const;
  const [playModes, ranks, roles, schedules, goals, styles] = queries;

  const failed = queries.find((query) => query.isError);
  if (failed) return <ErrorState error={failed.error} onRetry={() => queries.forEach((query) => void query.refetch())} />;
  if (!playModes.data || !ranks.data || !roles.data || !schedules.data || !goals.data || !styles.data) {
    return <Skeleton className="h-72 w-full" />;
  }

  return (
    <GameProfileForm
      profile={profile}
      game={game}
      options={{
        playModes: playModes.data,
        ranks: ranks.data,
        roles: roles.data,
        schedules: schedules.data,
        goals: goals.data,
        styles: styles.data,
      }}
    />
  );
}

function GameProfileForm({ profile, game, options }: { profile: PlayerProfile; game: GameSlug; options: Options }) {
  const { t } = useProfileMessages();
  const optionLabel = useOptionLabel();
  const [rank, setRank] = useState(rankKey(profile.rankTier, profile.rankLevel));
  // Roles are stored by label; older rows may hold the id, so match either.
  const [role, setRole] = useState(() => findRoleLabel(options.roles, profile.role));
  const [schedule, setSchedule] = useState(() => known(profile.schedule, options.schedules));
  const [goals, setGoals] = useState(() => known(profile.goals, options.goals));
  const [styles, setStyles] = useState(() => known(profile.communicationStyles, options.styles));
  const [playModes, setPlayModes] = useState<PlayMode[]>(profile.playModes?.length ? profile.playModes : ["ranked"]);

  const lol = game === "league_of_legends";
  const aramOnly = lol && isAramOnly(playModes);
  const selectedRank = options.ranks.find((option) => rankKey(option.tier, option.level) === rank);
  const scheduleInvalid = schedule.length === 0;
  const rankMissing = !aramOnly && (!selectedRank || !role);

  // ARAM-only has no rank or role; the API stores Unranked / Fill.
  const rankFields = aramOnly || !selectedRank ? {} : { rankTier: selectedRank.tier, rankLevel: selectedRank.level, role };
  const patch = { ...(lol ? { playModes } : {}), ...rankFields, schedule, goals, communicationStyles: styles };
  const [saved] = useState(() => JSON.stringify(patch));
  useDraft("game", { patch: JSON.stringify(patch) === saved ? null : patch, invalid: rankMissing || scheduleInvalid || playModes.length === 0 });

  const localized = (kind: "goal" | "style" | "schedule", list: LookupOption[]) =>
    list.map((option) => ({ id: option.id, label: optionLabel(kind, option.id, option.label) }));

  return (
    <FieldGroup>
      {lol && (
        <FieldSet data-invalid={playModes.length === 0 || undefined}>
          <FieldLegend variant="label">{t("playModes")}</FieldLegend>
          <ChipSelect
            label={t("playModes")}
            options={options.playModes.map((option) => ({ id: option.id, label: t(option.id === "aram" ? "mode_aram" : "mode_ranked") }))}
            value={playModes}
            onChange={(next) => setPlayModes(next as PlayMode[])}
          />
          {playModes.length === 0 && <FieldError>{t("playModesError")}</FieldError>}
        </FieldSet>
      )}
      {!aramOnly && (
        <RankRoleFields options={options} rank={selectedRank ? rank : ""} role={role} onRank={setRank} onRole={setRole} />
      )}
      <FieldSet data-invalid={scheduleInvalid || undefined}>
        <FieldLegend variant="label">{t("schedule")}</FieldLegend>
        <ChipSelect
          label={t("schedule")}
          options={localized("schedule", options.schedules)}
          value={schedule}
          onChange={setSchedule}
        />
        {scheduleInvalid && <FieldError>{t("scheduleError")}</FieldError>}
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">{t("goals")}</FieldLegend>
        <FieldDescription>{t("maxTwo")}</FieldDescription>
        <ChipSelect label={t("goals")} options={localized("goal", options.goals)} value={goals} onChange={setGoals} max={2} />
      </FieldSet>
      <FieldSet>
        <FieldLegend variant="label">{t("styles")}</FieldLegend>
        <FieldDescription>{t("maxTwo")}</FieldDescription>
        <ChipSelect label={t("styles")} options={localized("style", options.styles)} value={styles} onChange={setStyles} max={2} />
      </FieldSet>
    </FieldGroup>
  );
}

function RankRoleFields({
  options,
  rank,
  role,
  onRank,
  onRole,
}: {
  options: Options;
  rank: string;
  role: string;
  onRank: (value: string) => void;
  onRole: (value: string) => void;
}) {
  const { t } = useProfileMessages();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="profile-rank">{t("rank")}</FieldLabel>
        <Select value={rank} onValueChange={onRank}>
          <SelectTrigger id="profile-rank" className="w-full">
            <SelectValue placeholder={t("selectRank")} />
          </SelectTrigger>
          <SelectContent>
            {options.ranks.map((option) => (
              <SelectItem key={option.label} value={rankKey(option.tier, option.level)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="profile-role">{t("role")}</FieldLabel>
        <Select value={role} onValueChange={onRole}>
          <SelectTrigger id="profile-role" className="w-full">
            <SelectValue placeholder={t("selectRole")} />
          </SelectTrigger>
          <SelectContent>
            {options.roles.map((option) => (
              <SelectItem key={option.id} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
