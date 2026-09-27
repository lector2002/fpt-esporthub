"use client";

import { cn } from "@/lib/utils";
import { type LolStatic, SHARD_ROWS, shardIcon } from "../data-dragon";
import { type GuidesMessageKey, useGuidesMessages } from "../messages";
import type { RunePage } from "../types";
import { GameIcon } from "./guide-parts";

/** Full rune page like the in-game editor: every rune of both trees, the chosen ones lit, the rest dimmed. */
export function RuneTree({ page, lol }: { page: RunePage; lol: LolStatic | undefined }) {
  const { t } = useGuidesMessages();
  const chosen = new Set(page.perks);
  const primary = lol?.trees[page.primaryStyle];
  const secondary = lol?.trees[page.subStyle];

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" data-rune-page>
      <TreeColumn label={t("primaryTree")} treeId={page.primaryStyle} rows={primary?.slots ?? []} chosen={chosen} lol={lol} />
      <TreeColumn label={t("secondaryTree")} treeId={page.subStyle} rows={secondary?.slots.slice(1) ?? []} chosen={chosen} lol={lol} />
      {page.shards && page.shards.length === 3 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">{t("shards")}</p>
          {SHARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5">
              {row.map((id, index) => {
                const on = page.shards![rowIndex] === id;
                const image = shardIcon(id);
                const name = t(`shard_${id}` as GuidesMessageKey);
                return (
                  <GameIcon
                    key={`${id}-${index}`}
                    asset={image ? { name, image } : undefined}
                    fallback={id}
                    size="sm"
                    round
                    dim={!on}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TreeColumn({ label, treeId, rows, chosen, lol }: { label: string; treeId: number; rows: number[][]; chosen: Set<number>; lol: LolStatic | undefined }) {
  const tree = lol?.runes[treeId];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <GameIcon asset={tree} fallback={treeId} size="sm" />
        <p className="text-xs font-medium text-muted-foreground">
          {label}
          {tree && <span className="text-foreground"> · {tree.name}</span>}
        </p>
      </div>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={cn("flex gap-1.5", rowIndex === 0 && rows.length === 4 && "pb-1")}>
          {row.map((id) => (
            <GameIcon key={id} asset={lol?.runes[id]} fallback={id} size={rowIndex === 0 && rows.length === 4 ? "lg" : "md"} round dim={!chosen.has(id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
