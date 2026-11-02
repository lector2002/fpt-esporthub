"use client";

import Link from "next/link";
import { ChevronRight, Eye, Flag, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UserAvatar } from "@/components/common/user-avatar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GAMES } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { useActivityMessages } from "../activity-messages";
import { formatNumber } from "../format";
import type { ActivityDay, AdminActivity, MessagePlace } from "../types";
import { DailyBars, DayAxis, dayLabel } from "./daily-bars";

const PLACES: MessagePlace[] = ["direct", "team", "community"];
const PLACE_COLOR: Record<MessagePlace, string> = { direct: "bg-chart-1", team: "bg-chart-2", community: "bg-chart-4" };

type Metric = Exclude<keyof ActivityDay, "day">;

/** Small daily bar strip for a KPI card. */
export function Sparkline({ data, metric, label }: { data: AdminActivity; metric: Metric; label: string }) {
  const { t, language } = useActivityMessages();
  const values = data.daily.map((day) => day[metric]);
  return (
    <DailyBars
      className="mt-2 h-10"
      days={data.daily.map((day) => day.day)}
      series={[{ values, className: "bg-chart-1" }]}
      label={t("sparkLabel", { label, days: data.days, max: formatNumber(Math.max(...values), language) })}
      title={(index) => t("barDay", { day: dayLabel(data.daily[index].day, language), count: formatNumber(values[index], language) })}
    />
  );
}

export function ActiveChart({ data }: { data: AdminActivity }) {
  const { t, language } = useActivityMessages();
  const days = data.daily.map((day) => day.day);
  const values = data.daily.map((day) => day.active);
  const total = formatNumber(data.active.users, language);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t("activePlayers")}</CardTitle>
        <CardDescription>{t("activeDefinition")}</CardDescription>
        <CardAction className="text-sm font-semibold tabular-nums">{t("activeTotal", { count: total, days: data.days })}</CardAction>
      </CardHeader>
      <CardContent>
        {data.active.users === 0 ? (
          <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t("noActivity")}</p>
        ) : (
          <>
            <DailyBars
              days={days}
              series={[{ values, className: "bg-chart-1" }]}
              label={t("activeTotal", { count: total, days: data.days })}
              title={(index) => t("activeBar", { day: dayLabel(days[index], language), active: values[index], signups: data.daily[index].signups })}
            />
            <DayAxis days={days} language={language} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PlacesCard({ data }: { data: AdminActivity }) {
  const { t, language } = useActivityMessages();
  const { byPlace, total } = data.messages;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("places")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {PLACES.map((place) => byPlace[place] > 0 && <div key={place} className={PLACE_COLOR[place]} style={{ width: `${(byPlace[place] / total) * 100}%` }} />)}
        </div>
        <ul className="flex flex-col gap-2">
          {PLACES.map((place) => (
            <li key={place} className="flex items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-full", PLACE_COLOR[place])} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{t(`place_${place}`)}</span>
              <span className="font-medium tabular-nums">{formatNumber(byPlace[place], language)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function AttentionCard({ data }: { data: AdminActivity }) {
  const { t, language } = useActivityMessages();
  const rows: { icon: LucideIcon; label: string; count: number; href: string }[] = [
    { icon: Flag, label: t("reportsOpen"), count: data.attention.reportsOpen, href: "/admin/reports" },
    { icon: MessageSquareText, label: t("feedbackPending"), count: data.attention.feedbackPending, href: "/admin/feedback" },
    { icon: Eye, label: t("feedbackReviewing"), count: data.attention.feedbackReviewing, href: "/admin/feedback?status=REVIEWING" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("attention")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 flex flex-col">
          {rows.map(({ icon: Icon, label, count, href }) => (
            <li key={label}>
              <Link href={href} className="flex items-center gap-3 rounded-md px-2 py-2 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className={cn("font-medium tabular-nums", count > 0 ? "text-warning" : "text-muted-foreground")}>{formatNumber(count, language)}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

interface Leader {
  user: { id: string; displayName: string; avatarKey: string | null };
  detail: string;
}

/** Top 5 people for one measure, each linking to their admin user page. */
export function LeaderCard({ title, leaders }: { title: string; leaders: Leader[] }) {
  const { t } = useActivityMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOne")}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {leaders.map(({ user, detail }) => (
              <li key={user.id} className="flex items-center gap-3">
                <UserAvatar name={user.displayName} imageKey={user.avatarKey} className="size-8" />
                <Link href={`/admin/users/${user.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {user.displayName}
                </Link>
                <span className="text-sm text-muted-foreground tabular-nums">{detail}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function NewTeamsCard({ data }: { data: AdminActivity }) {
  const { t } = useActivityMessages();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("newTeams")}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.newTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTeams")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.newTeams.map((team) => (
              <li key={team.id} className="flex items-center gap-3">
                <UserAvatar name={team.name} imageKey={team.logoKey} kind="team" className="size-8" />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/teams/${team.id}`} className="block truncate font-medium hover:underline">
                    {team.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{t("teamMeta", { name: team.captain.displayName, count: team.members })}</p>
                </div>
                <span className="text-sm text-muted-foreground">{GAMES[team.game].short}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
