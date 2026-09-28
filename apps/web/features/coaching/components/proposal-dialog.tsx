"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DURATION_OPTIONS, MAX_SESSION_PRICE, formatVnd, priceFor, toLocalInputValue } from "../format";
import { useWallet } from "@/features/credits/api";
import { COIN_OUTLINE, SPEND_SURFACE } from "@/features/credits/components/spend-button";
import { creditsForVnd } from "@/features/credits/pricing";
import { cn } from "@/lib/utils";
import { useCoachingMessages } from "../messages";
import type { ProposalInput } from "../types";

const MESSAGE_MAX = 500;
const DAY_MS = 86_400_000;

export interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  hourlyRate: number;
  /** Prefill for a counter proposal; omit for a new request. */
  initial?: ProposalInput;
  /** The viewer is the player who pays: in credit mode, show the hold against their balance. */
  payer?: boolean;
  pending: boolean;
  onSubmit: (input: ProposalInput) => void;
}

export function ProposalDialog({ open, onOpenChange, title, ...formProps }: ProposalDialogProps) {
  const { t } = useCoachingMessages();
  const inCredits = useWallet().data?.coachingInCredits;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t(inCredits ? "paymentNoteCredits" : "paymentNote")}</DialogDescription>
        </DialogHeader>
        {open && <ProposalForm {...formProps} />}
      </DialogContent>
    </Dialog>
  );
}

type Errors = Partial<Record<"startAt" | "price" | "message", string>>;

function initialState(hourlyRate: number, initial?: ProposalInput) {
  const durationMinutes = initial?.durationMinutes ?? 60;
  return {
    startAt: toLocalInputValue(initial ? new Date(initial.proposedStartAt) : new Date(Date.now() + DAY_MS)),
    durationMinutes,
    price: String(initial?.proposedPrice ?? priceFor(hourlyRate, durationMinutes)),
    message: initial?.message ?? "",
  };
}

function ProposalForm({ submitLabel, hourlyRate, initial, payer = false, pending, onSubmit }: Omit<ProposalDialogProps, "open" | "onOpenChange" | "title">) {
  const { t } = useCoachingMessages();
  const wallet = useWallet().data;
  const [form, setForm] = useState(() => initialState(hourlyRate, initial));
  const [priceTouched, setPriceTouched] = useState(Boolean(initial));
  const [errors, setErrors] = useState<Errors>({});

  function setDuration(value: string) {
    const durationMinutes = Number(value);
    setForm((current) => ({ ...current, durationMinutes, price: priceTouched ? current.price : String(priceFor(hourlyRate, durationMinutes)) }));
  }

  function validate(): Errors {
    const next: Errors = {};
    const start = new Date(form.startAt);
    if (!form.startAt || Number.isNaN(start.getTime()) || start <= new Date()) next.startAt = t("errStartFuture");
    const price = Number(form.price);
    if (form.price.trim() === "" || !Number.isInteger(price) || price < 0 || price > MAX_SESSION_PRICE) {
      next.price = t("errPrice", { max: formatVnd(MAX_SESSION_PRICE) });
    }
    if (form.message.length > MESSAGE_MAX) next.message = t("errMessageLong");
    return next;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({
      proposedStartAt: new Date(form.startAt).toISOString(),
      durationMinutes: form.durationMinutes,
      proposedPrice: Number(form.price),
      message: form.message.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <ProposalFields
        form={form}
        errors={errors}
        hourlyRate={hourlyRate}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onDurationChange={setDuration}
        onPriceChange={(price) => {
          setPriceTouched(true);
          setForm((current) => ({ ...current, price }));
        }}
      />
      {payer && wallet?.coachingInCredits && <HoldLine price={Number(form.price) || 0} />}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {t("close")}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

type FormState = ReturnType<typeof initialState>;

interface ProposalFieldsProps {
  form: FormState;
  errors: Errors;
  hourlyRate: number;
  onChange: (patch: Partial<FormState>) => void;
  onDurationChange: (value: string) => void;
  onPriceChange: (value: string) => void;
}

function ProposalFields({ form, errors, hourlyRate, onChange, onDurationChange, onPriceChange }: ProposalFieldsProps) {
  const { t } = useCoachingMessages();
  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={Boolean(errors.startAt)}>
        <FieldLabel htmlFor="proposal-start">{t("startAt")}</FieldLabel>
        <Input
          id="proposal-start"
          type="datetime-local"
          min={toLocalInputValue(new Date())}
          value={form.startAt}
          aria-invalid={Boolean(errors.startAt)}
          onChange={(event) => onChange({ startAt: event.target.value })}
        />
        <FieldError>{errors.startAt}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="proposal-duration">{t("duration")}</FieldLabel>
        <Select value={String(form.durationMinutes)} onValueChange={onDurationChange}>
          <SelectTrigger id="proposal-duration" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((minutes) => (
              <SelectItem key={minutes} value={String(minutes)}>
                {t("minutes", { count: minutes })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field data-invalid={Boolean(errors.price)}>
        <FieldLabel htmlFor="proposal-price">{t("price")}</FieldLabel>
        <Input
          id="proposal-price"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={form.price}
          aria-invalid={Boolean(errors.price)}
          onChange={(event) => onPriceChange(event.target.value)}
        />
        <FieldDescription>{t("priceHint", { amount: formatVnd(priceFor(hourlyRate, form.durationMinutes)) })}</FieldDescription>
        <FieldError>{errors.price}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors.message)}>
        <FieldLabel htmlFor="proposal-message">{t("message")}</FieldLabel>
        <Textarea
          id="proposal-message"
          rows={3}
          maxLength={MESSAGE_MAX}
          placeholder={t("messagePlaceholder")}
          value={form.message}
          aria-invalid={Boolean(errors.message)}
          onChange={(event) => onChange({ message: event.target.value })}
        />
        <FieldError>{errors.message}</FieldError>
      </Field>
    </FieldGroup>
  );
}

/** Credits held when the session is agreed, next to the balance; a top-up link when it won't cover it. */
function HoldLine({ price }: { price: number }) {
  const { t } = useCoachingMessages();
  const wallet = useWallet().data;
  const pack = wallet?.packages[0];
  if (!wallet || !pack) return null;
  const hold = creditsForVnd(price, pack);
  const short = wallet.balance < hold;
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", SPEND_SURFACE)} data-testid="coaching-hold">
      <span className="flex items-center gap-1.5">
        <Coins className="size-4 text-coin" aria-hidden />
        {t("holdLine", { hold, balance: wallet.balance })}
      </span>
      {short && (
        <Button asChild size="sm" variant="outline" className={COIN_OUTLINE}>
          <Link href="/wallet">{t("topUpNeed", { count: hold - wallet.balance })}</Link>
        </Button>
      )}
    </div>
  );
}
