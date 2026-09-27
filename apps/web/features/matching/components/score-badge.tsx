"use client";

import { cn } from "@/lib/utils";
import { scoreTone } from "../filters";
import { useMatchingMessages } from "../messages";

/** One score format everywhere: "92%" over "phù hợp" on cards, "92% phù hợp" inline in lists. */
export function ScoreBadge({ score, inline = false, className }: { score: number; inline?: boolean; className?: string }) {
  const { t } = useMatchingMessages();
  if (inline) {
    return <span className={cn("text-sm font-semibold tabular-nums", scoreTone(score), className)}>{t("scoreInline", { score })}</span>;
  }
  return (
    <div className={cn("text-right", className)}>
      <div className={cn("text-2xl leading-none font-bold tabular-nums", scoreTone(score))}>{score}%</div>
      <div className="mt-1 text-xs text-muted-foreground">{t("score")}</div>
    </div>
  );
}
