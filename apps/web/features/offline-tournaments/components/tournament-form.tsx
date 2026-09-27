"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { FormSection } from "@/components/common/form-section";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { useActiveGame } from "@/lib/game";
import { useCreateTournament, useMyVenue } from "../api";
import { toDateTimeLocal } from "../format";
import { useOfflineMessages, type OfflineMessageKey } from "../messages";
import type { OfflineTournament, TournamentFormat } from "../types";
import { TournamentCard } from "./tournaments-page";

const FORMATS: TournamentFormat[] = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION"];
const BEST_OF = ["1", "3", "5"];
const TEAM_SIZES = ["1", "2", "3", "4", "5"];

interface FormValues {
  title: string;
  game: GameSlug;
  format: TournamentFormat;
  teamSize: string;
  maxTeams: string;
  bestOf: string;
  finalBestOf: string;
  entryFee: string;
  prize: string;
  rules: string;
  startsAt: string;
}

type FormErrors = Partial<Record<keyof FormValues, OfflineMessageKey>>;

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const title = values.title.trim();
  if (title.length < 3 || title.length > 120) errors.title = "errTitle";
  const maxTeams = Number(values.maxTeams);
  if (!Number.isInteger(maxTeams) || maxTeams < 3 || maxTeams > 64) errors.maxTeams = "errMaxTeams";
  const fee = Number(values.entryFee);
  if (!Number.isInteger(fee) || fee < 0 || fee > 10_000_000) errors.entryFee = "errFee";
  if (!values.startsAt || new Date(values.startsAt).getTime() <= Date.now()) errors.startsAt = "errFuture";
  return errors;
}

/** The cup card players will see in the list, from the form as it is filled in. */
function toPreview(values: FormValues, venue: OfflineTournament["venue"], fallbackTitle: string): OfflineTournament {
  const number = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  const startsAt = new Date(values.startsAt);
  return {
    id: "preview",
    title: values.title.trim() || fallbackTitle,
    game: values.game,
    format: values.format,
    teamSize: number(values.teamSize),
    maxTeams: number(values.maxTeams),
    bestOf: number(values.bestOf),
    finalBestOf: number(values.finalBestOf),
    entryFee: number(values.entryFee),
    prize: values.prize.trim() || null,
    rules: null,
    startsAt: Number.isNaN(startsAt.getTime()) ? new Date().toISOString() : startsAt.toISOString(),
    status: "REGISTRATION",
    championEntryId: null,
    entryCount: 0,
    venue,
  };
}

function defaultStart() {
  const date = new Date(Date.now() + 86_400_000);
  date.setHours(19, 0, 0, 0);
  return toDateTimeLocal(date);
}

export function NewTournamentPage() {
  const { t } = useOfflineMessages();
  const router = useRouter();
  const { game } = useActiveGame();
  const create = useCreateTournament();
  const venue = useMyVenue().data;
  const [values, setValues] = useState<FormValues>({
    title: "",
    game: game ?? "league_of_legends",
    format: "SINGLE_ELIMINATION",
    teamSize: "5",
    maxTeams: "8",
    bestOf: "1",
    finalBestOf: "3",
    entryFee: "0",
    prize: "",
    rules: "",
    startsAt: defaultStart(),
  });
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validate(values) : {};
  const set = <K extends keyof FormValues>(key: K) => (value: FormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const onInput = (key: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(key)(event.target.value as never);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values)).length > 0) return;
    create.mutate(
      {
        title: values.title.trim(),
        game: values.game,
        format: values.format,
        teamSize: Number(values.teamSize),
        maxTeams: Number(values.maxTeams),
        bestOf: Number(values.bestOf),
        finalBestOf: Number(values.finalBestOf),
        entryFee: Number(values.entryFee),
        prize: values.prize.trim() || undefined,
        rules: values.rules.trim() || undefined,
        startsAt: new Date(values.startsAt).toISOString(),
      },
      {
        onSuccess: (created) => {
          toast.success(t("created"));
          router.push(`/host/tournaments/${created.id}`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const choice = (key: "game" | "format" | "bestOf" | "finalBestOf", legend: OfflineMessageKey, options: { value: string; label: string }[]) => (
    <FieldSet>
      <FieldLegend variant="label">{t(legend)}</FieldLegend>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={values[key]}
        onValueChange={(value) => value && set(key)(value as never)}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="data-[state=on]:text-primary">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  );
  const bestOfOptions = BEST_OF.map((value) => ({ value, label: t("bestOfShort", { count: value }) }));

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/host">
          <ArrowLeft /> {t("hostTitle")}
        </Link>
      </Button>
      <PageHeader title={t("formTitle")} image="/images/cafe-cup.webp" />
      <form onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <FormSection title={t("sectionCupBasics")}>
            <Field data-invalid={Boolean(errors.title)}>
              <FieldLabel htmlFor="ot-title">{t("titleLabel")}</FieldLabel>
              <Input id="ot-title" value={values.title} onChange={onInput("title")} maxLength={120} aria-invalid={Boolean(errors.title)} />
              {errors.title && <FieldError>{t(errors.title)}</FieldError>}
            </Field>
            {choice("game", "game", (Object.keys(GAMES) as GameSlug[]).map((slug) => ({ value: slug, label: GAMES[slug].label })))}
          </FormSection>
          <FormSection title={t("sectionCupFormat")}>
            {choice("format", "format", FORMATS.map((value) => ({ value, label: t(`format_${value}`) })))}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ot-team-size">{t("teamSizeLabel")}</FieldLabel>
                <Select value={values.teamSize} onValueChange={set("teamSize")}>
                  <SelectTrigger id="ot-team-size" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(errors.maxTeams)}>
                <FieldLabel htmlFor="ot-max-teams">{t("maxTeamsLabel")}</FieldLabel>
                <Input id="ot-max-teams" type="number" inputMode="numeric" min={3} max={64} value={values.maxTeams} onChange={onInput("maxTeams")} />
                {errors.maxTeams && <FieldError>{t(errors.maxTeams)}</FieldError>}
              </Field>
            </div>
            {choice("bestOf", "bestOfLabel", bestOfOptions)}
            {choice("finalBestOf", "finalBestOfLabel", bestOfOptions)}
          </FormSection>
          <FormSection title={t("sectionCupSchedule")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.entryFee)}>
                <FieldLabel htmlFor="ot-fee">{t("entryFeeLabel")}</FieldLabel>
                <Input id="ot-fee" type="number" inputMode="numeric" min={0} step={1000} value={values.entryFee} onChange={onInput("entryFee")} />
                {errors.entryFee && <FieldError>{t(errors.entryFee)}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(errors.startsAt)}>
                <FieldLabel htmlFor="ot-starts">{t("startsAtLabel")}</FieldLabel>
                <Input id="ot-starts" type="datetime-local" value={values.startsAt} onChange={onInput("startsAt")} />
                {errors.startsAt && <FieldError>{t(errors.startsAt)}</FieldError>}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ot-prize">{t("prizeLabel")}</FieldLabel>
              <Input id="ot-prize" value={values.prize} onChange={onInput("prize")} maxLength={200} />
            </Field>
          </FormSection>
          <FormSection title={t("sectionCupRules")}>
            <Field>
              <FieldLabel htmlFor="ot-rules">{t("rulesLabel")}</FieldLabel>
              <Textarea id="ot-rules" value={values.rules} onChange={onInput("rules")} maxLength={4000} rows={5} />
            </Field>
          </FormSection>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <p className="text-sm font-medium text-muted-foreground">{t("cupPreviewTitle")}</p>
          {venue && (
            <div inert data-testid="cup-preview">
              <TournamentCard tournament={toPreview(values, venue, t("cupNamePreview"))} href="/host" />
            </div>
          )}
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending && <Spinner />} {t("create")}
          </Button>
        </aside>
      </form>
    </div>
  );
}
