"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "../format";

export interface BarSeries {
  values: number[];
  /** Background class of this series' bars. */
  className: string;
}

/** One column per day, series side by side; the highest value of any series fills the height. Hover a column for its numbers. */
export function DailyBars({ days, series, title, label, className }: { days: string[]; series: BarSeries[]; title: (index: number) => string; label: string; className?: string }) {
  const max = Math.max(1, ...series.flatMap((one) => one.values));
  return (
    <div role="img" aria-label={label} className={cn("flex h-40 items-end gap-px", className)}>
      {days.map((day, index) => (
        <div key={day} title={title(index)} className="group flex h-full min-w-0 flex-1 items-end gap-px">
          {series.map((one, seriesIndex) => {
            const value = one.values[index];
            return (
              <div
                key={seriesIndex}
                className={cn("min-w-0 flex-1 rounded-t-sm transition-opacity", value ? cn(one.className, "opacity-80 group-hover:opacity-100") : "bg-muted")}
                style={{ height: value ? `${Math.max(4, (value / max) * 100)}%` : "2px" }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Vietnam day key ("2026-11-02") as a short date; noon keeps it on the same day in any browser time zone. */
export const dayLabel = (day: string, language: "vi" | "en") => formatDate(`${day}T12:00:00`, language);

export function DayAxis({ days, language }: { days: string[]; language: "vi" | "en" }) {
  return (
    <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
      <span>{dayLabel(days[0], language)}</span>
      <span>{dayLabel(days[days.length - 1], language)}</span>
    </div>
  );
}
