"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { championSplashUrl, SplashBanner } from "@/components/common/champion-splash";
import { EmptyState, QueryState } from "@/components/common/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/features/coaching/format";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useGuide } from "../api";
import { type Asset, type LolStatic, useChampionAbilities, useLolStatic } from "../data-dragon";
import { useGuidesMessages } from "../messages";
import type { GuideData, GuideDetail } from "../types";
import { GameIcon, groupIds, WinRate } from "./guide-parts";
import { ItemsSection, LateItemsSection, MatchupsSection, RunesSection, SkillsSection, SpellsSection } from "./guide-sections";
import { PremiumCard } from "./premium-card";

export function GuideDetailPage({ champion, position }: { champion: string; position: string }) {
  const { t, language } = useGuidesMessages();
  const guide = useGuide(champion, position);
  const lol = useLolStatic(language).data;
  const abilities = useChampionAbilities(language, champion).data;

  if (guide.error instanceof ApiError && guide.error.status === 404) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t("notFound")}
        action={
          <Button asChild variant="outline">
            <Link href="/guides">{t("back")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <QueryState query={guide}>
      {(detail) => {
        const data = detail.premium ?? detail.free;
        const props = { data, locked: detail.locked, lol };
        return (
          <div className="flex flex-col gap-6">
            <Button asChild variant="ghost" size="sm" className="self-start">
              <Link href="/guides">
                <ArrowLeft /> {t("back")}
              </Link>
            </Button>
            <GuideHeader detail={detail} data={data} lol={lol} />
            <QuickBuild data={data} lol={lol} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <RunesSection {...props} />
              </div>
              <SkillsSection {...props} abilities={abilities} />
              <SpellsSection {...props} />
              <ItemsSection {...props} />
              <LateItemsSection {...props} />
              <MatchupsSection {...props} />
            </div>
            {!detail.premium && <PremiumCard id="premium" />}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <a href={detail.guide.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                {t("source", { source: detail.guide.source })} <ExternalLink className="size-3" aria-hidden />
              </a>
              <span>{t("patch", { patch: detail.guide.patch })}</span>
              <span>{t("updated", { time: formatDateTime(detail.guide.fetchedAt, language) })}</span>
            </p>
          </div>
        );
      }}
    </QueryState>
  );
}

function GuideHeader({ detail, data, lol }: { detail: GuideDetail; data: GuideData; lol: LolStatic | undefined }) {
  const { t } = useGuidesMessages();
  const { guide } = detail;
  const asset = lol?.champions[guide.champion];
  const stats = [
    { label: t("winRate"), value: guide.winRate, win: true },
    { label: t("pickRate"), value: guide.pickRate, win: false },
    { label: t("banRate"), value: guide.banRate, win: false },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SplashBanner src={championSplashUrl(guide.champion)} fade="from-background" className="-mb-20 h-44 rounded-xl sm:h-60" />
      <div className="relative flex flex-wrap items-center gap-4 px-1 sm:px-4">
        {asset ? <img src={asset.image} alt="" className="size-16 rounded-xl" /> : <div className="size-16 rounded-xl bg-muted" />}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{asset?.name ?? guide.champion}</h1>
          {asset?.title && <p className="text-sm text-muted-foreground capitalize">{asset.title}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {data.tier !== undefined && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="cursor-help" tabIndex={0}>
                    {t("tier", { tier: data.tier === 0 ? "OP" : data.tier })}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{t("tierHint")}</TooltipContent>
              </Tooltip>
            )}
            <Badge variant="outline">{t("patch", { patch: guide.patch })}</Badge>
          </div>
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto">
          {stats.map((stat) =>
            stat.value === null ? null : (
              <div key={stat.label} className="rounded-lg border border-border px-3 py-2 text-center">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="text-lg">{stat.win ? <WinRate value={stat.value} /> : <span className="font-semibold tabular-nums">{stat.value.toFixed(1)}%</span>}</dd>
              </div>
            ),
          )}
        </dl>
      </div>
      {detail.positions.length > 1 && (
        <nav aria-label={t("positions")} className="flex flex-wrap gap-1.5">
          {detail.positions.map((item) => (
            <Button key={item} asChild size="sm" variant={item === guide.position ? "default" : "outline"}>
              <Link href={`/guides/${encodeURIComponent(guide.champion)}/${item}`} aria-current={item === guide.position ? "page" : undefined}>
                {t(`pos_${item}`)}
              </Link>
            </Button>
          ))}
        </nav>
      )}
    </div>
  );
}

/** The most picked choice of each part, with names under the icons, for players who just want one build. */
function QuickBuild({ data, lol }: { data: GuideData; lol: LolStatic | undefined }) {
  const { t } = useGuidesMessages();
  const runes = data.runes[0];
  const skills = data.skillOrder[0];
  const blocks: { label: string; ids: number[]; table: Record<number, Asset> | undefined; round?: boolean; wide?: boolean }[] = [
    { label: t("runes"), ids: runes ? [runes.perks[0], runes.subStyle] : [], table: lol?.runes, round: true },
    { label: t("spells"), ids: data.spells[0]?.ids ?? [], table: lol?.spells },
    { label: t("starterItems"), ids: data.starterItems[0]?.ids ?? [], table: lol?.items },
    { label: t("coreBuilds"), ids: data.coreBuilds[0]?.ids ?? [], table: lol?.items, wide: true },
    { label: t("boots"), ids: data.boots[0]?.ids ?? [], table: lol?.items },
  ];

  return (
    <Card data-section="overview" className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">{t("overview")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        {blocks.map((block) => (
          <div key={block.label} className={cn("flex min-w-0 flex-col gap-2", block.wide && "col-span-2")}>
            <p className="text-xs font-medium text-muted-foreground">{block.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {groupIds(block.ids).map(({ id, count }, index) => (
                <span key={`${id}-${index}`} className="flex w-12 flex-col items-center gap-1 text-center">
                  <GameIcon asset={block.table?.[id]} fallback={id} round={block.round} count={count} />
                  <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">{block.table?.[id]?.name ?? id}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
        {skills && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{t("maxOrder")}</p>
            <p className="text-lg font-bold tracking-wide">{skills.order.join(" > ")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
