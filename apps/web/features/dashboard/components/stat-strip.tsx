"use client";

import Link from "next/link";
import { CircleCheck, MessageSquare, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Readiness } from "@/features/profile/types";
import { cn } from "@/lib/utils";
import { useDashboardMessages } from "../messages";
import type { DashboardView } from "../types";
import { firstFixLink } from "./todo-card";

function StatTile({ href, icon: Icon, label, value, highlight, children }: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  highlight: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-foreground/10 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
    >
      <span className="flex items-start gap-1.5 text-xs leading-tight text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden /> <span className="line-clamp-2">{label}</span>
      </span>
      <span className={cn("text-2xl font-semibold tabular-nums [font-stretch:112%]", highlight && "text-primary")}>{value}</span>
      {children}
    </Link>
  );
}

/** What needs attention, each tile opening the place that fixes it. */
export function StatStrip({ counts, readiness }: { counts: DashboardView["counts"]; readiness: Readiness | null }) {
  const { t } = useDashboardMessages();
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="stat-strip">
      <StatTile
        href="/inbox?tab=requests"
        icon={UserPlus}
        label={t("pendingRequests")}
        value={counts.pendingIncoming}
        highlight={counts.pendingIncoming > 0}
      />
      <StatTile href="/inbox" icon={MessageSquare} label={t("unreadMessages")} value={counts.unreadMessages} highlight={counts.unreadMessages > 0} />
      {readiness && (
        <StatTile
          href={firstFixLink(readiness)}
          icon={CircleCheck}
          label={t("readiness")}
          value={`${readiness.percent}%`}
          highlight={false}
        >
          <Progress value={readiness.percent} aria-label={t("readiness")} className="mt-1 h-1" />
        </StatTile>
      )}
    </div>
  );
}
