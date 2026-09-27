"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChampionAbilities } from "../data-dragon";
import { useGuidesMessages } from "../messages";
import type { SkillOrderOption } from "../types";
import { GameIcon } from "./guide-parts";

const KEYS = ["Q", "W", "E", "R"] as const;

/** Max priority with ability icons, plus a level 1-18 grid when the source has the per-level path. */
export function SkillOrder({ option, abilities }: { option: SkillOrderOption; abilities: ChampionAbilities | undefined }) {
  const { t } = useGuidesMessages();
  const ability = (key: string) => abilities?.spells.find((spell) => spell.key === key);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" aria-label={`${t("maxOrder")}: ${option.order.join(" > ")}`}>
        <span className="text-xs font-medium text-muted-foreground">{t("maxOrder")}</span>
        {option.order.map((key, index) => (
          <span key={key} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
            <span className="relative">
              <GameIcon asset={ability(key)} fallback={key} />
              <kbd className="absolute -right-1 -bottom-1 rounded bg-background px-1 text-[10px] font-bold leading-4 ring-1 ring-border">{key}</kbd>
            </span>
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("maxHint")}</p>
      {option.levels && option.levels.length > 0 && (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5 text-xs">
            <caption className="sr-only">{t("skillOrder")}</caption>
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  {t("level")}
                </th>
                {option.levels.map((_, index) => (
                  <th key={index} scope="col" className="w-6 font-normal text-muted-foreground tabular-nums">
                    {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KEYS.map((key) => (
                <tr key={key}>
                  <th scope="row" className="pr-1">
                    <span className="flex items-center gap-1">
                      <GameIcon asset={ability(key)} fallback={key} size="sm" />
                      <span className="w-3 font-bold">{key}</span>
                    </span>
                  </th>
                  {option.levels!.map((skill, index) => (
                    <td
                      key={index}
                      className={cn(
                        "size-6 rounded text-center font-bold",
                        skill === key ? (key === "R" ? "bg-primary text-primary-foreground" : "bg-foreground/80 text-background") : "bg-muted/60",
                      )}
                    >
                      {skill === key ? key : <span className="sr-only">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
