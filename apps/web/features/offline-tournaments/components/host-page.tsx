"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, Clock, QrCode, ShieldCheck, Store, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ListSkeleton, QueryState } from "@/components/common/query-state";
import { PageHeader } from "@/components/common/page-header";
import { StepStrip } from "@/components/common/step-strip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useApplyVenue, useHostedTournaments, useMyVenue } from "../api";
import { useOfflineMessages, type OfflineMessageKey } from "../messages";
import type { Venue, VenueInput } from "../types";
import { TournamentCard } from "./tournaments-page";

export function HostPage() {
  const { t } = useOfflineMessages();
  const venue = useMyVenue();
  const approved = venue.data?.status === "APPROVED";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("hostTitle")}
        description={t("hostDescription")}
        image="/images/cafe-cup.webp"
        actions={
          approved && (
            <Button asChild>
              <Link href="/host/tournaments/new">
                <CalendarPlus /> {t("newTournament")}
              </Link>
            </Button>
          )
        }
      />
      {venue.isPending ? (
        <ListSkeleton rows={2} />
      ) : approved ? (
        <HostedList venue={venue.data!} />
      ) : (
        <VenueApplication venue={venue.data ?? null} />
      )}
    </div>
  );
}

function HostedList({ venue }: { venue: Venue }) {
  const { t } = useOfflineMessages();
  const hosted = useHostedTournaments(true);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="hosted-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="hosted-heading" className="text-lg font-semibold">
          {t("hostedTitle")}
        </h2>
        <Badge variant="outline">
          <Store /> {venue.name}
        </Badge>
      </div>
      <QueryState query={hosted} isEmpty={(list) => list.length === 0} empty={{ icon: CalendarPlus, title: t("noHosted") }}>
        {(list) => (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} href={`/host/tournaments/${tournament.id}`} />
            ))}
          </div>
        )}
      </QueryState>
    </section>
  );
}

type VenueForm = { name: string; address: string; city: string; pcCount: string; phone: string };
type VenueErrors = Partial<Record<keyof VenueForm, OfflineMessageKey>>;

function validateVenue(values: VenueForm): VenueErrors {
  const errors: VenueErrors = {};
  const length = (value: string, min: number, max: number) => value.trim().length >= min && value.trim().length <= max;
  if (!length(values.name, 2, 80)) errors.name = "errVenueName";
  if (!length(values.address, 5, 200)) errors.address = "errVenueAddress";
  if (!length(values.city, 2, 60)) errors.city = "errVenueCity";
  const pcs = Number(values.pcCount);
  if (!Number.isInteger(pcs) || pcs < 10 || pcs > 1000) errors.pcCount = "errPcCount";
  if (values.phone.trim() && !/^[0-9+ ]{8,15}$/.test(values.phone.trim())) errors.phone = "errPhone";
  return errors;
}

function VenueApplication({ venue }: { venue: Venue | null }) {
  const { t } = useOfflineMessages();
  const apply = useApplyVenue();
  const [values, setValues] = useState<VenueForm>({
    name: venue?.name ?? "",
    address: venue?.address ?? "",
    city: venue?.city ?? "",
    pcCount: venue ? String(venue.pcCount) : "",
    phone: venue?.phone ?? "",
  });
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validateVenue(values) : {};
  const set = (key: keyof VenueForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateVenue(values)).length > 0) return;
    const input: VenueInput = {
      name: values.name.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      pcCount: Number(values.pcCount),
      ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
    };
    apply.mutate(input, {
      onSuccess: () => toast.success(t("venueSubmitted")),
      onError: (error) => toast.error(error.message),
    });
  };

  const fields: { key: keyof VenueForm; label: OfflineMessageKey; type?: string; inputMode?: "numeric" | "tel"; wide?: boolean }[] = [
    { key: "name", label: "venueName", wide: true },
    { key: "address", label: "venueAddress", wide: true },
    { key: "city", label: "venueCity" },
    { key: "pcCount", label: "venuePcCount", type: "number", inputMode: "numeric" },
    { key: "phone", label: "venuePhone", type: "tel", inputMode: "tel" },
  ];

  const steps = [
    { icon: Store, label: t("stepVenue") },
    { icon: ShieldCheck, label: t("stepVenueReview") },
    { icon: QrCode, label: t("stepVenueHost") },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <StepStrip steps={steps} current={venue?.status === "PENDING" ? 1 : 0} />
      {venue?.status === "PENDING" && (
        <Alert>
          <Clock />
          <AlertTitle>{t("venue_PENDING")}</AlertTitle>
          <AlertDescription>{t("venuePendingHint")}</AlertDescription>
        </Alert>
      )}
      {venue?.status === "REJECTED" && (
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>{t("venue_REJECTED")}</AlertTitle>
          <AlertDescription>
            {venue.reviewNote ? t("reviewNote", { note: venue.reviewNote }) : null} {t("venueRejectedHint")}
          </AlertDescription>
        </Alert>
      )}
      {venue?.status === "PENDING" ? null : (
        <Card>
          <CardHeader>
            <CardTitle>{t("venueApply")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} noValidate className="flex flex-col gap-6">
              <FieldGroup className="grid gap-5 sm:grid-cols-3">
                {fields.map(({ key, label, type, inputMode, wide }) => (
                  <Field key={key} data-invalid={Boolean(errors[key])} className={cn(wide && "sm:col-span-3")}>
                    <FieldLabel htmlFor={`venue-${key}`}>{t(label)}</FieldLabel>
                    <Input
                      id={`venue-${key}`}
                      type={type ?? "text"}
                      inputMode={inputMode}
                      value={values[key]}
                      onChange={set(key)}
                      aria-invalid={Boolean(errors[key])}
                    />
                    {errors[key] && <FieldError>{t(errors[key])}</FieldError>}
                  </Field>
                ))}
              </FieldGroup>
              <Button type="submit" className="self-start" disabled={apply.isPending}>
                {apply.isPending && <Spinner />} {t(venue ? "venueResubmit" : "venueSubmit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
