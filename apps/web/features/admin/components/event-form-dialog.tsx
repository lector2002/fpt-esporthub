"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { GAMES, type GameSlug } from "@/lib/contracts";
import { useSaveTournament } from "../api";
import { toSlug } from "../format";
import { useAdminMessages, type AdminMessageKey } from "../messages";
import type { TournamentEvent, TournamentInput } from "../types";

type FormValues = {
  title: string;
  game: GameSlug;
  organizer: string;
  startsAt: string;
  deadlineAt: string;
  rules: string;
  registrationUrl: string;
  format: string;
  prize: string;
  teamSize: string;
};
type FormErrors = Partial<Record<keyof FormValues, AdminMessageKey>>;

/** ISO string to the local "YYYY-MM-DDTHH:mm" format a datetime-local input expects. */
function toLocalInput(iso: string) {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function initialValues(event: TournamentEvent | null): FormValues {
  return {
    title: event?.title ?? "",
    game: event ? toSlug(event.game) : "valorant",
    organizer: event?.organizer ?? "",
    startsAt: event ? toLocalInput(event.startsAt) : "",
    deadlineAt: event ? toLocalInput(event.deadlineAt) : "",
    rules: event?.rules ?? "",
    registrationUrl: event?.registrationUrl ?? "",
    format: event?.format ?? "",
    prize: event?.prize ?? "",
    teamSize: event?.teamSize ? String(event.teamSize) : "",
  };
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title = "required";
  if (!values.organizer.trim()) errors.organizer = "required";
  if (!values.startsAt) errors.startsAt = "required";
  if (!values.deadlineAt) errors.deadlineAt = "required";
  if (values.startsAt && values.deadlineAt && new Date(values.deadlineAt) > new Date(values.startsAt)) {
    errors.deadlineAt = "deadlineAfterStart";
  }
  if (values.registrationUrl.trim() && !/^https?:\/\/\S+$/i.test(values.registrationUrl.trim())) errors.registrationUrl = "invalidUrl";
  const size = Number(values.teamSize);
  if (values.teamSize && (!Number.isInteger(size) || size < 1 || size > 10)) errors.teamSize = "invalidTeamSize";
  return errors;
}

function toInput(values: FormValues): TournamentInput {
  return {
    title: values.title.trim(),
    game: values.game,
    organizer: values.organizer.trim(),
    startsAt: new Date(values.startsAt).toISOString(),
    deadlineAt: new Date(values.deadlineAt).toISOString(),
    rules: values.rules.trim() || undefined,
    registrationUrl: values.registrationUrl.trim(),
    format: values.format.trim(),
    prize: values.prize.trim(),
    teamSize: values.teamSize ? Number(values.teamSize) : null,
  };
}

export function EventFormDialog({ event, open, onClose }: { event: TournamentEvent | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {open && <EventForm key={event?.id ?? "new"} event={event} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({ event, onDone }: { event: TournamentEvent | null; onDone: () => void }) {
  const { t } = useAdminMessages();
  const save = useSaveTournament();
  const [values, setValues] = useState(() => initialValues(event));
  const [errors, setErrors] = useState<FormErrors>({});

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const onSubmit = (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    save.mutate(
      { id: event?.id, values: toInput(values) },
      {
        onSuccess: () => {
          toast.success(t("eventSaved"));
          onDone();
        },
        onError: (error) => toast.error(t("updateFailed"), { description: error.message }),
      },
    );
  };

  const textField = (key: Exclude<keyof FormValues, "game" | "rules">, label: AdminMessageKey, type = "text") => (
    <Field data-invalid={Boolean(errors[key])}>
      <FieldLabel htmlFor={`event-${key}`}>{t(label)}</FieldLabel>
      <Input
        id={`event-${key}`}
        type={type}
        value={values[key]}
        onChange={(changeEvent) => set(key, changeEvent.target.value)}
        aria-invalid={Boolean(errors[key])}
        maxLength={type === "text" || type === "url" ? (key === "registrationUrl" ? 500 : 120) : undefined}
        min={type === "number" ? 1 : undefined}
        max={type === "number" ? 10 : undefined}
      />
      {errors[key] && <FieldError>{t(errors[key])}</FieldError>}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t(event ? "editEvent" : "createEvent")}</DialogTitle>
      </DialogHeader>
      <FieldGroup className="gap-4">
        {textField("title", "fieldTitle")}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-game">{t("fieldGame")}</FieldLabel>
            <Select value={values.game} onValueChange={(value) => set("game", value as GameSlug)}>
              <SelectTrigger id="event-game" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GAMES) as GameSlug[]).map((slug) => (
                  <SelectItem key={slug} value={slug}>
                    {GAMES[slug].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {textField("organizer", "fieldOrganizer")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("startsAt", "fieldStartsAt", "datetime-local")}
          {textField("deadlineAt", "fieldDeadlineAt", "datetime-local")}
        </div>
        {textField("registrationUrl", "fieldRegistrationUrl", "url")}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          {textField("format", "fieldFormat")}
          {textField("teamSize", "fieldTeamSize", "number")}
        </div>
        {textField("prize", "fieldPrize")}
        <Field>
          <FieldLabel htmlFor="event-rules">{t("fieldRules")}</FieldLabel>
          <Textarea
            id="event-rules"
            value={values.rules}
            onChange={(changeEvent) => set("rules", changeEvent.target.value)}
            maxLength={4000}
            rows={4}
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Spinner /> : <Save />} {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
