"use client";

import { AlertTriangle, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Asset } from "../data-dragon";
import { useGuidesMessages } from "../messages";

/** Under this many games the numbers get a warning. */
export const SMALL_SAMPLE = 1000;

/** Game icon with its name as alt text and a name + description tooltip. Unknown ids show the raw id. */
export function GameIcon({ asset, fallback, size = "md", round = false, dim = false, count = 1 }: { asset: Asset | undefined; fallback: number | string; size?: "sm" | "md" | "lg"; round?: boolean; dim?: boolean; count?: number }) {
  const box = { sm: "size-6", md: "size-8", lg: "size-11" }[size];
  if (count > 1) {
    return (
      <span className="relative shrink-0">
        <GameIcon asset={asset} fallback={fallback} size={size} round={round} dim={dim} />
        <span className="absolute -right-1 -bottom-1 rounded bg-background px-1 text-[10px] font-bold leading-4 ring-1 ring-border">×{count}</span>
      </span>
    );
  }
  if (!asset) {
    return <span className={cn(box, "flex shrink-0 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground")}>{fallback}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img
          src={asset.image}
          alt={asset.name}
          className={cn(box, "shrink-0 bg-black/40", round ? "rounded-full ring-1 ring-border" : "rounded-md", dim && "opacity-30 grayscale")}
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p className="font-medium">{asset.name}</p>
        {asset.description && <p className="mt-1 line-clamp-4 text-xs opacity-80">{asset.description}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

/** Win rate with a word as well as a color, so it doesn't rely on color alone. */
export function WinRate({ value, className }: { value: number; className?: string }) {
  const { t } = useGuidesMessages();
  const level = value >= 52 ? "high" : value <= 48 ? "low" : null;
  return (
    <span className={cn("font-semibold tabular-nums", level === "high" && "text-success", level === "low" && "text-destructive", className)}>
      {value.toFixed(1)}%{level && <span className="sr-only"> ({t(level)})</span>}
    </span>
  );
}

export function SampleWarning({ games }: { games: number }) {
  const { t } = useGuidesMessages();
  if (games >= SMALL_SAMPLE) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-label={t("smallSample")} />
      </TooltipTrigger>
      <TooltipContent>{t("smallSample")}</TooltipContent>
    </Tooltip>
  );
}

/** Collapses repeats (two potions) into one entry with a count, keeping order. */
export function groupIds(ids: number[]) {
  const groups: { id: number; count: number }[] = [];
  for (const id of ids) {
    const last = groups.at(-1);
    if (last?.id === id) last.count += 1;
    else groups.push({ id, count: 1 });
  }
  return groups;
}

/** Pick rate, win rate and games as table cells, matching OptionTable's header. */
export function StatCells({ pickRate, winRate, games }: { pickRate?: number; winRate: number; games: number }) {
  return (
    <>
      {pickRate !== undefined && <td className="px-2 py-2 text-right text-sm tabular-nums">{pickRate.toFixed(1)}%</td>}
      <td className="px-2 py-2 text-right text-sm">
        <WinRate value={winRate} />
      </td>
      <td className="hidden px-2 py-2 text-right text-xs text-muted-foreground tabular-nums sm:table-cell">
        <span className="inline-flex items-center justify-end gap-1">
          <SampleWarning games={games} />
          {games.toLocaleString()}
        </span>
      </td>
    </>
  );
}

/** Accessible table for a list of options: first column is the option, then pick rate, win rate, games. */
export function OptionTable({ caption, children, pickRate = true }: { caption: string; children: React.ReactNode; pickRate?: boolean }) {
  const { t } = useGuidesMessages();
  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          <th scope="col" className="px-2 py-1.5 text-left font-normal">
            {t("option")}
          </th>
          {pickRate && (
            <th scope="col" className="px-2 py-1.5 text-right font-normal">
              {t("pickRate")}
            </th>
          )}
          <th scope="col" className="px-2 py-1.5 text-right font-normal">
            {t("winRate")}
          </th>
          <th scope="col" className="hidden px-2 py-1.5 text-right font-normal sm:table-cell">
            {t("games")}
          </th>
        </tr>
      </thead>
      <tbody className="[&_tr]:border-b [&_tr]:border-border/60 [&_tr:last-child]:border-0">{children}</tbody>
    </table>
  );
}

/** Blurred placeholder rows standing in for premium options, with a jump to the unlock card. */
export function LockedRows({ count }: { count: number }) {
  const { t } = useGuidesMessages();
  if (count <= 0) return null;
  return (
    <a
      href="#premium"
      data-locked={count}
      className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Lock className="size-4" aria-hidden /> {t("moreLocked", { count })}
    </a>
  );
}
