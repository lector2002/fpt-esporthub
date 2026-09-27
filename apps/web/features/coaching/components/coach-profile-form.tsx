"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormSection as Section } from "@/components/common/form-section";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GAMES, gameSlug, type CosmeticsView, type GameSlug } from "@/lib/contracts";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useSaveCoachProfile } from "../api";
import { MAX_HOURLY_RATE, formatVnd, priceFor } from "../format";
import { useCoachingMessages } from "../messages";
import { AVAILABILITY_SUGGESTIONS, RATE_PRESETS, SPECIALTY_SUGGESTIONS } from "../suggestions";
import type { CoachProfileInput, CoachSummary } from "../types";
import { ChipInput } from "./chip-input";
import { CoachCard } from "./coach-card";

const ITEM_MAX = 40;
const BIO_MIN = 20;
const BIO_MAX = 1000;
const NO_COSMETICS: CosmeticsView = { frame: null, banner: null, nameColor: null, title: null };

type FormState = Omit<CoachProfileInput, "hourlyRate"> & { hourlyRate: string };
type Errors = Partial<Record<keyof FormState, string>>;

function useValidator() {
  const { t } = useCoachingMessages();
  return (form: FormState): Errors => {
    const errors: Errors = {};
    const longItem = (items: string[]) => items.some((item) => item.length > ITEM_MAX);
    if (form.specialties.length < 1 || form.specialties.length > 5) errors.specialties = t("errSpecialties");
    else if (longItem(form.specialties)) errors.specialties = t("errItemLong");
    if (form.availability.length < 1 || form.availability.length > 14) errors.availability = t("errAvailability");
    else if (longItem(form.availability)) errors.availability = t("errItemLong");
    const rate = Number(form.hourlyRate);
    if (form.hourlyRate.trim() === "" || !Number.isInteger(rate) || rate < 0 || rate > MAX_HOURLY_RATE) {
      errors.hourlyRate = t("errPrice", { max: formatVnd(MAX_HOURLY_RATE) });
    }
    const bio = form.bio.trim().length;
    if (bio < BIO_MIN || bio > BIO_MAX) errors.bio = t("errBio");
    return errors;
  };
}

interface ChipFieldProps {
  id: string;
  label: string;
  placeholder: string;
  max: number;
  values: string[];
  suggestions: string[];
  error?: string;
  onChange: (values: string[]) => void;
}

function ChipField({ id, label, placeholder, max, values, suggestions, error, onChange }: ChipFieldProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ChipInput
        id={id}
        values={values}
        onChange={onChange}
        max={max}
        maxLength={ITEM_MAX}
        placeholder={placeholder}
        invalid={Boolean(error)}
        suggestions={suggestions}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function GameField({ value, games, onChange }: { value: GameSlug; games: GameSlug[]; onChange: (game: GameSlug) => void }) {
  const { t } = useCoachingMessages();
  return (
    <Field>
      <FieldLabel htmlFor="coach-game">{t("game")}</FieldLabel>
      <Select value={value} onValueChange={(game) => onChange(game as GameSlug)}>
        <SelectTrigger id="coach-game" className="w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {games.map((game) => (
            <SelectItem key={game} value={game}>
              {GAMES[game].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function RateField({ value, error, onChange }: { value: string; error?: string; onChange: (value: string) => void }) {
  const { t } = useCoachingMessages();
  const rate = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(rate) && rate > 0;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="coach-rate">{t("hourlyRate")}</FieldLabel>
      <InputGroup className="sm:w-64">
        <InputGroupInput
          id="coach-rate"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_HOURLY_RATE}
          step={10000}
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>{t("ratePerHour")}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <div className="flex flex-wrap gap-1.5">
        {RATE_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="xs"
            variant={value === String(preset) ? "secondary" : "outline"}
            aria-pressed={value === String(preset)}
            onClick={() => onChange(String(preset))}
          >
            {preset === 0 ? t("rateFree") : formatVnd(preset)}
          </Button>
        ))}
      </div>
      {valid && <FieldDescription>{t("rateSession", { price: formatVnd(priceFor(rate, 30)), long: formatVnd(priceFor(rate, 90)) })}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** What players will see in the coach list, rebuilt from the form as it is typed. */
function usePreview(form: FormState, existing: CoachSummary | null): CoachSummary | null {
  const { user, profiles } = useSession();
  if (!user) return null;
  const own = profiles.find((item) => gameSlug(item.game) === form.game);
  const rate = Number(form.hourlyRate);
  return {
    id: existing?.id ?? "preview",
    userId: user.id,
    displayName: user.displayName,
    avatarKey: user.avatarKey,
    coverKey: user.coverKey,
    reputationBadge: user.reputationBadge,
    cosmetics: existing?.cosmetics ?? NO_COSMETICS,
    mains: own?.mains ?? existing?.mains ?? [],
    recentChampion: own?.recentChampion ?? existing?.recentChampion ?? null,
    game: form.game,
    rankTier: own?.rankTier ?? existing?.rankTier ?? null,
    rankLevel: own?.rankLevel ?? existing?.rankLevel ?? null,
    role: own?.role ?? existing?.role ?? null,
    verificationStatus: own?.verificationStatus ?? existing?.verificationStatus ?? "UNVERIFIED",
    specialties: form.specialties,
    hourlyRate: Number.isFinite(rate) && rate >= 0 ? rate : 0,
    bio: form.bio,
    availability: form.availability,
    active: existing?.active ?? true,
    reviewStatus: existing?.reviewStatus ?? "PENDING",
    avgRating: existing?.avgRating ?? null,
    reviewCount: existing?.reviewCount ?? 0,
    completedSessions: existing?.completedSessions ?? 0,
  };
}

/** Form on the left, a live coach card preview and the save button in a sticky column on the right. */
export function CoachProfileForm({
  existing,
  games,
  defaultGame,
  aside,
}: {
  existing: CoachSummary | null;
  games: GameSlug[];
  defaultGame: GameSlug;
  aside?: React.ReactNode;
}) {
  const { t, language } = useCoachingMessages();
  const validate = useValidator();
  const save = useSaveCoachProfile();
  const [form, setForm] = useState<FormState>(() => ({
    game: existing?.game ?? defaultGame,
    specialties: existing?.specialties ?? [],
    availability: existing?.availability ?? [],
    hourlyRate: existing ? String(existing.hourlyRate) : "",
    bio: existing?.bio ?? "",
  }));
  const [errors, setErrors] = useState<Errors>({});
  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const preview = usePreview(form, existing);
  const bioLength = form.bio.trim().length;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(
      { ...form, hourlyRate: Number(form.hourlyRate), bio: form.bio.trim() },
      { onSuccess: () => toast.success(t("saved")), onError: (error) => toast.error(error.message) },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Section title={t("sectionFocus")}>
          <GameField value={form.game} games={games} onChange={(game) => update({ game })} />
          <ChipField
            id="coach-specialties"
            label={t("specialtiesLabel")}
            placeholder={t("specialtyPlaceholder")}
            max={5}
            values={form.specialties}
            suggestions={SPECIALTY_SUGGESTIONS[form.game]}
            error={errors.specialties}
            onChange={(specialties) => update({ specialties })}
          />
        </Section>
        <Section title={t("sectionSchedule")}>
          <ChipField
            id="coach-availability"
            label={t("availabilityLabel")}
            placeholder={t("availabilityPlaceholder")}
            max={14}
            values={form.availability}
            suggestions={AVAILABILITY_SUGGESTIONS[language]}
            error={errors.availability}
            onChange={(availability) => update({ availability })}
          />
          <RateField value={form.hourlyRate} error={errors.hourlyRate} onChange={(hourlyRate) => update({ hourlyRate })} />
        </Section>
        <Section title={t("sectionAbout")}>
          <Field data-invalid={Boolean(errors.bio)}>
            <FieldLabel htmlFor="coach-bio">{t("bio")}</FieldLabel>
            <Textarea
              id="coach-bio"
              rows={6}
              maxLength={BIO_MAX}
              placeholder={t("bioPlaceholder")}
              value={form.bio}
              aria-invalid={Boolean(errors.bio)}
              onChange={(event) => update({ bio: event.target.value })}
            />
            <FieldDescription className={cn("text-right tabular-nums", bioLength > 0 && bioLength < BIO_MIN && "text-warning")}>
              {t("bioCount", { count: bioLength, max: BIO_MAX, min: BIO_MIN })}
            </FieldDescription>
            <FieldError>{errors.bio}</FieldError>
          </Field>
        </Section>
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
        <p className="text-sm font-medium text-muted-foreground">{t("previewTitle")}</p>
        {preview && (
          <div inert data-testid="coach-preview">
            <CoachCard coach={preview} />
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5 shrink-0" aria-hidden />
          <span>{t("coverFromProfile")}</span>
          <Link href="/profile/me" className="ml-auto shrink-0 font-medium text-foreground hover:underline">
            {t("changeCover")}
          </Link>
        </p>
        {aside}
        <Button type="submit" size="lg" disabled={save.isPending}>
          {existing ? t("saveChanges") : t("createProfile")}
        </Button>
      </aside>
    </form>
  );
}
