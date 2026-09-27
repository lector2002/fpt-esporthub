"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoachingMessages } from "../messages";

const STARS = [1, 2, 3, 4, 5];

/** Read-only stars, rounded to the nearest whole star. */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden>
      {STARS.map((star) => (
        <Star key={star} className={cn("size-3.5", star <= filled ? "fill-coin text-coin" : "text-muted-foreground/50")} />
      ))}
    </span>
  );
}

/** Average + review count, or "no reviews yet". */
export function RatingSummary({ avgRating, reviewCount }: { avgRating: number | null; reviewCount: number }) {
  const { t } = useCoachingMessages();
  if (avgRating === null) return <span className="text-xs text-muted-foreground">{t("noReviewsYet")}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <RatingStars value={avgRating} />
      <span className="font-medium">{avgRating.toFixed(1)}</span>
      <span className="text-muted-foreground">({t("reviewCount", { count: reviewCount })})</span>
    </span>
  );
}

export function RatingPicker({ value, onChange, invalid }: { value: number; onChange: (value: number) => void; invalid?: boolean }) {
  const { t } = useCoachingMessages();
  return (
    <div role="radiogroup" aria-label={t("rating")} aria-invalid={invalid} className="flex gap-1">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={t("starLabel", { count: star })}
          onClick={() => onChange(star)}
          className="rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Star className={cn("size-6", star <= value ? "fill-coin text-coin" : "text-muted-foreground")} />
        </button>
      ))}
    </div>
  );
}
