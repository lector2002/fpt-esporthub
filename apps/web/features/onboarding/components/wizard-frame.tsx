"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { BrandMark } from "@/features/auth/components/brand-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnboardingMessages } from "../messages";
import type { OnboardingStep } from "../types";

const STEP_KEYS = {
  game: "stepGame",
  mode: "stepMode",
  rank: "stepRank",
  preferences: "stepPreferences",
  riot: "stepRiot",
  link: "stepLink",
  questionnaire: "stepQuestionnaire",
  review: "stepReview",
} as const;

/** Page chrome for onboarding: brand bar with an exit, card, and step progress when `steps` is given. */
export function WizardFrame({
  title,
  steps,
  current = 0,
  exitHref,
  children,
}: {
  title?: string;
  steps?: OnboardingStep[];
  current?: number;
  exitHref?: string;
  children: React.ReactNode;
}) {
  const { t } = useOnboardingMessages();
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <BrandMark name="FPT EsportHub" />
          {exitHref && (
            <Button asChild variant="ghost" size="sm">
              <Link href={exitHref}>
                <X /> {t("exit")}
              </Link>
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col px-4 py-8">
        <Card className="overflow-visible">
          <img src="/images/onboarding.webp" alt="" className="aspect-[4/1] w-full object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />
          {title && (
            <CardHeader className="gap-3">
              <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              {steps && <StepProgress steps={steps} current={current} label={(step) => t(STEP_KEYS[step])} />}
            </CardHeader>
          )}
          <CardContent>{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}

function StepProgress({ steps, current, label }: { steps: OnboardingStep[]; current: number; label: (step: OnboardingStep) => string }) {
  const { t } = useOnboardingMessages();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("stepOf", { current: current + 1, total: steps.length })}</span>
        <span className="font-medium text-foreground sm:hidden">{label(steps[current])}</span>
      </div>
      <Progress value={((current + 1) / steps.length) * 100} aria-label={t("stepOf", { current: current + 1, total: steps.length })} />
      <ol className="hidden gap-2 sm:flex">
        {steps.map((step, index) => (
          <li
            key={step}
            aria-current={index === current ? "step" : undefined}
            className={cn("min-w-0 flex-1 truncate text-xs", index === current ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            {label(step)}
          </li>
        ))}
      </ol>
    </div>
  );
}
