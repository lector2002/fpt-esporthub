"use client";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "../format";
import { useAdminMessages } from "../messages";
import type { AdminFeedbackPage } from "../types";
import { DailyBars, DayAxis, dayLabel } from "./daily-bars";

const SENT = "bg-chart-1";
const CLOSED = "bg-chart-2";

/** Sent vs closed per day, and the pages with most open feedback (click one to filter the list). */
export function FeedbackStats({ data, path, onPath }: { data: AdminFeedbackPage; path: string | null; onPath: (path: string | null) => void }) {
  const { t, language } = useAdminMessages();
  const days = data.trend.map((row) => row.day);
  const sent = data.trend.map((row) => row.created);
  const closed = data.trend.map((row) => row.closed);
  const total = (values: number[]) => formatNumber(values.reduce((sum, value) => sum + value, 0), language);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card size="sm" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("feedbackTrend")}</CardTitle>
          <CardAction className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <Key className={SENT} label={`${t("trendSent")} ${total(sent)}`} />
            <Key className={CLOSED} label={`${t("trendClosed")} ${total(closed)}`} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <DailyBars
            className="h-28"
            days={days}
            series={[
              { values: sent, className: SENT },
              { values: closed, className: CLOSED },
            ]}
            label={t("trendSummary", { sent: total(sent), closed: total(closed) })}
            title={(index) => t("trendBar", { day: dayLabel(days[index], language), sent: sent[index], closed: closed[index] })}
          />
          <DayAxis days={days} language={language} />
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("openPages")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noOpenPages")}</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {data.topPages.map((row) => (
                <li key={row.page}>
                  <button
                    type="button"
                    aria-pressed={path === row.page}
                    onClick={() => onPath(path === row.page ? null : row.page)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                      path === row.page && "bg-muted",
                    )}
                  >
                    <code className="min-w-0 flex-1 truncate">{row.page}</code>
                    <span className="text-xs text-muted-foreground tabular-nums">{t("openCount", { count: row.open })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} aria-hidden />
      {label}
    </span>
  );
}
