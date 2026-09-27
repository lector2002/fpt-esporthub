"use client";

import Link from "next/link";
import { CalendarCheck, ChevronLeft, ClipboardList, Clock, ExternalLink, Gamepad2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ListSkeleton, QueryState } from "@/components/common/query-state";
import { StepStrip } from "@/components/common/step-strip";
import { useActiveGame } from "@/lib/game";
import { useSession } from "@/lib/session";
import { useMyCoachProfile, useSetCoachActive } from "../api";
import { useCoachingMessages } from "../messages";
import type { CoachSummary, MyCoachProfile } from "../types";
import { CoachProfileForm } from "./coach-profile-form";

function ListingSwitch({ coach }: { coach: CoachSummary }) {
  const { t } = useCoachingMessages();
  const setActive = useSetCoachActive();
  return (
    <Card size="sm">
      <CardContent>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="coach-active">{t("listingVisible")}</FieldLabel>
            <FieldDescription>{coach.active ? t("listingActive") : t("listingPaused")}</FieldDescription>
          </FieldContent>
          <Switch
            id="coach-active"
            checked={coach.active}
            disabled={setActive.isPending}
            onCheckedChange={(active) =>
              setActive.mutate(active, {
                onSuccess: () => toast.success(active ? t("toastActive") : t("toastPaused")),
                onError: (error) => toast.error(error.message),
              })
            }
          />
        </Field>
      </CardContent>
    </Card>
  );
}

/** Pending and rejected listings are hidden from players; editing a rejected one sends it back for review. */
function ReviewStatus({ coach }: { coach: MyCoachProfile }) {
  const { t } = useCoachingMessages();
  if (coach.reviewStatus === "APPROVED") return null;
  const rejected = coach.reviewStatus === "REJECTED";
  return (
    <Alert variant={rejected ? "destructive" : "default"}>
      {rejected ? <XCircle /> : <Clock />}
      <AlertTitle>{t(rejected ? "reviewRejected" : "reviewPending")}</AlertTitle>
      <AlertDescription>
        {rejected && coach.reviewNote ? `${t("reviewNote", { note: coach.reviewNote })} ` : ""}
        {t(rejected ? "reviewRejectedHint" : "reviewPendingHint")}
      </AlertDescription>
    </Alert>
  );
}

/** How listing works, shown until the first save. */
function CoachSteps() {
  const { t } = useCoachingMessages();
  const steps = [
    { icon: ClipboardList, label: t("stepListing") },
    { icon: ShieldCheck, label: t("stepReview") },
    { icon: CalendarCheck, label: t("stepBooked") },
  ];
  return <StepStrip steps={steps} current={0} />;
}

function NoGameProfile() {
  const { t } = useCoachingMessages();
  return (
    <EmptyState
      icon={Gamepad2}
      title={t("needGameProfile")}
      action={
        <Button asChild>
          <Link href="/onboarding">{t("createGameProfile")}</Link>
        </Button>
      }
    />
  );
}

export function MyCoachProfile() {
  const { t } = useCoachingMessages();
  const { status } = useSession();
  const { game, games } = useActiveGame();
  const mine = useMyCoachProfile();
  const viewPublic = mine.data && (
    <Button asChild variant="outline">
      <Link href={`/coaches/${mine.data.id}`}>
        <ExternalLink /> {t("viewPublic")}
      </Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/coaches">
          <ChevronLeft /> {t("allCoaches")}
        </Link>
      </Button>
      <PageHeader title={mine.data === null ? t("becomeCoach") : t("profileTitle")} actions={viewPublic} image="/images/hero-coaching.webp" />
      {status === "loading" ? (
        <ListSkeleton />
      ) : !game ? (
        <NoGameProfile />
      ) : (
        <QueryState query={mine} skeleton={<ListSkeleton />}>
          {(coach) => (
            <div className="flex flex-col gap-6">
              {coach ? <ReviewStatus coach={coach} /> : <CoachSteps />}
              <CoachProfileForm
                key={coach?.id ?? "new"}
                existing={coach}
                games={games}
                defaultGame={game}
                aside={coach && <ListingSwitch coach={coach} />}
              />
            </div>
          )}
        </QueryState>
      )}
    </div>
  );
}
