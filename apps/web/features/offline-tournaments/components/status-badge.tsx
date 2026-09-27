"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOfflineMessages } from "../messages";
import type { TournamentStatus } from "../types";

const TONE: Record<TournamentStatus, string> = {
  REGISTRATION: "text-primary",
  CHECK_IN: "text-amber-400",
  LIVE: "border-red-500/40 text-red-400",
  COMPLETED: "text-muted-foreground",
  CANCELLED: "text-muted-foreground line-through",
};

export function TournamentStatusBadge({ status, className }: { status: TournamentStatus; className?: string }) {
  const { t } = useOfflineMessages();
  return (
    <Badge variant="outline" className={cn(TONE[status], className)}>
      {status === "LIVE" && <span className="size-1.5 animate-pulse rounded-full bg-red-500" aria-hidden />}
      {t(`status_${status}`)}
    </Badge>
  );
}
