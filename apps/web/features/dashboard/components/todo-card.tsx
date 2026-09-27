"use client";

import Link from "next/link";
import { ChevronRight, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Readiness, ReadinessCheckId } from "@/features/profile/types";
import { useDashboardMessages } from "../messages";

/** Where each incomplete item gets fixed: anchored sections of /profile/me. */
const FIX_LINKS: Record<ReadinessCheckId, string> = {
  bio: "/profile/me#overview",
  rank: "/profile/me#game",
  schedule: "/profile/me#game",
  goals: "/profile/me#game",
  communication: "/profile/me#game",
  riot: "/profile/me#riot",
  questionnaire: "/profile/me#playstyle",
};

export function firstFixLink(readiness: Readiness) {
  const next = readiness.checks.find((check) => !check.complete);
  return next ? FIX_LINKS[next.id] : "/profile/me";
}

/** Only what is still missing from the profile; gone once it is complete. */
export function TodoCard({ readiness }: { readiness: Readiness }) {
  const { t } = useDashboardMessages();
  const missing = readiness.checks.filter((check) => !check.complete);
  if (missing.length === 0) return null;

  return (
    <Card data-testid="todo-card">
      <CardHeader>
        <CardTitle>{t("todo")}</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="tabular-nums">
            {missing.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 flex flex-col">
          {missing.map((check) => (
            <li key={check.id}>
              <Link
                href={FIX_LINKS[check.id]}
                className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1">{t(`check_${check.id}`)}</span>
                <span className="text-xs text-muted-foreground">{t("fix")}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
