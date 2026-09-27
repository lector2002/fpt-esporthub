"use client";

import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Asset, ChampionAbilities, LolStatic } from "../data-dragon";
import { useGuidesMessages } from "../messages";
import type { BuildOption, GuideData, Matchup, Section } from "../types";
import { GameIcon, groupIds, LockedRows, OptionTable, SampleWarning, StatCells, WinRate } from "./guide-parts";
import { RuneTree } from "./rune-tree";
import { SkillOrder } from "./skill-order";

export interface SectionProps {
  data: GuideData;
  locked: Record<Section, number> | null;
  lol: LolStatic | undefined;
}

function SectionCard({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card data-section={id} aria-labelledby={`guide-${id}`}>
      <CardHeader>
        <CardTitle id={`guide-${id}`} className="text-base">
          {title}
        </CardTitle>
        {hint && <CardDescription>{hint}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

/** Icons for one option; core builds get arrows and visible item names so the order is clear without hovering. */
function OptionIcons({ ids, table, path = false, named = false }: { ids: number[]; table: Record<number, Asset> | undefined; path?: boolean; named?: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-1.5">
      {groupIds(ids).map(({ id, count }, index) => (
        <span key={`${id}-${index}`} className="flex items-start gap-1.5">
          {path && index > 0 && <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden />}
          <span className="flex w-14 flex-col items-center gap-1 text-center">
            <GameIcon asset={table?.[id]} fallback={id} size={named ? "lg" : "md"} count={count} />
            {named && <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">{table?.[id]?.name ?? id}</span>}
          </span>
        </span>
      ))}
    </div>
  );
}

function BuildRows({ caption, options, table, path, named }: { caption: string; options: BuildOption[]; table: Record<number, Asset> | undefined; path?: boolean; named?: boolean }) {
  const { t } = useGuidesMessages();
  return (
    <OptionTable caption={caption}>
      {options.map((option, index) => (
        <tr key={index} data-option>
          <td className="px-2 py-2">
            <div className="flex flex-col gap-1">
              {index === 0 && (
                <Badge variant="outline" className="self-start">
                  {t("recommended")}
                </Badge>
              )}
              <OptionIcons ids={option.ids} table={table} path={path} named={named && index === 0} />
            </div>
          </td>
          <StatCells pickRate={option.pickRate} winRate={option.winRate} games={option.games} />
        </tr>
      ))}
    </OptionTable>
  );
}

export function RunesSection({ data, locked, lol }: SectionProps) {
  const { t } = useGuidesMessages();
  const [main, ...others] = data.runes;
  return (
    <SectionCard id="runes" title={t("runes")}>
      {main && (
        <>
          <RuneTree page={main} lol={lol} />
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Badge variant="outline">{t("recommended")}</Badge>
            <span>
              {t("pickRate")} <span className="tabular-nums">{main.pickRate.toFixed(1)}%</span>
            </span>
            <span>
              {t("winRate")} <WinRate value={main.winRate} />
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <SampleWarning games={main.games} />
              {t("gamesCount", { count: main.games.toLocaleString() })}
            </span>
          </p>
        </>
      )}
      {others.length > 0 && (
        <OptionTable caption={t("runes")}>
          {others.map((page, index) => (
            <tr key={index} data-option>
              <td className="px-2 py-2">
                <div className="flex flex-wrap items-center gap-1">
                  <GameIcon asset={lol?.runes[page.primaryStyle]} fallback={page.primaryStyle} size="sm" />
                  {page.perks.map((id) => (
                    <GameIcon key={id} asset={lol?.runes[id]} fallback={id} size="sm" round />
                  ))}
                  <GameIcon asset={lol?.runes[page.subStyle]} fallback={page.subStyle} size="sm" />
                </div>
              </td>
              <StatCells pickRate={page.pickRate} winRate={page.winRate} games={page.games} />
            </tr>
          ))}
        </OptionTable>
      )}
      <LockedRows count={locked?.runes ?? 0} />
    </SectionCard>
  );
}

export function SkillsSection({ data, locked, abilities }: SectionProps & { abilities: ChampionAbilities | undefined }) {
  const { t } = useGuidesMessages();
  const [main, ...others] = data.skillOrder;
  return (
    <SectionCard id="skills" title={t("skillOrder")}>
      {main && <SkillOrder option={main} abilities={abilities} />}
      {main && (
        <OptionTable caption={t("skillOrder")}>
          {[main, ...others].map((option, index) => (
            <tr key={index} data-option>
              <td className="px-2 py-2 text-sm font-semibold">{option.order.join(" > ")}</td>
              <StatCells pickRate={option.pickRate} winRate={option.winRate} games={option.games} />
            </tr>
          ))}
        </OptionTable>
      )}
      <LockedRows count={locked?.skillOrder ?? 0} />
    </SectionCard>
  );
}

export function SpellsSection({ data, locked, lol }: SectionProps) {
  const { t } = useGuidesMessages();
  return (
    <SectionCard id="spells" title={t("spells")}>
      <BuildRows caption={t("spells")} options={data.spells} table={lol?.spells} named />
      <LockedRows count={locked?.spells ?? 0} />
    </SectionCard>
  );
}

export function ItemsSection({ data, locked, lol }: SectionProps) {
  const { t } = useGuidesMessages();
  const parts = [
    { key: "starterItems", title: t("starterItems"), options: data.starterItems },
    { key: "boots", title: t("boots"), options: data.boots },
    { key: "coreBuilds", title: t("coreBuilds"), hint: t("coreHint"), options: data.coreBuilds, path: true },
  ] as const;
  return (
    <Card data-section="items" className="lg:col-span-2">
      <CardContent className="grid gap-6 md:grid-cols-2">
        {parts.map((part) => (
          <section key={part.key} aria-labelledby={`guide-${part.key}`} className={cn("flex min-w-0 flex-col gap-2", "path" in part && "md:col-span-2")}>
            <h2 id={`guide-${part.key}`} className="font-semibold">
              {part.title}
            </h2>
            {"hint" in part && <p className="text-xs text-muted-foreground">{part.hint}</p>}
            <BuildRows caption={part.title} options={part.options} table={lol?.items} path={"path" in part} named />
            <LockedRows count={locked?.[part.key] ?? 0} />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

export function LateItemsSection({ data, locked, lol }: SectionProps) {
  const { t } = useGuidesMessages();
  const slots = [
    { key: "fourthItems", title: t("fourthItems"), options: data.fourthItems },
    { key: "fifthItems", title: t("fifthItems"), options: data.fifthItems },
    { key: "sixthItems", title: t("sixthItems"), options: data.sixthItems },
  ] as const;
  if (slots.every((slot) => !slot.options?.length)) return null;
  return (
    <Card data-section="late-items" className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{t("laterItems")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        {slots.map((slot) => (
          <section key={slot.key} aria-label={slot.title} className="flex min-w-0 flex-col gap-2">
            <h3 className="text-sm font-medium">{slot.title}</h3>
            <BuildRows caption={slot.title} options={slot.options ?? []} table={lol?.items} named />
            <LockedRows count={locked?.[slot.key] ?? 0} />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

export function MatchupsSection({ data, locked, lol }: SectionProps) {
  const { t } = useGuidesMessages();
  const sides = [
    { key: "weakAgainst", title: t("weakAgainst"), list: data.weakAgainst },
    { key: "strongAgainst", title: t("strongAgainst"), list: data.strongAgainst },
  ] as const;
  if (sides.every((side) => !side.list?.length)) return null;
  return (
    <Card data-section="matchups" className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">{t("matchups")}</CardTitle>
        <CardDescription>{t("matchupHint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {sides.map((side) => (
          <section key={side.key} aria-label={side.title} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{side.title}</h3>
            <OptionTable caption={side.title} pickRate={false}>
              {(side.list ?? []).map((matchup: Matchup) => (
                <tr key={matchup.champion} data-option>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2 text-sm">
                      <GameIcon asset={lol?.champions[matchup.champion]} fallback={matchup.champion} />
                      {lol?.champions[matchup.champion]?.name ?? matchup.champion}
                    </span>
                  </td>
                  <StatCells winRate={matchup.winRate} games={matchup.games} />
                </tr>
              ))}
            </OptionTable>
            <LockedRows count={locked?.[side.key] ?? 0} />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
