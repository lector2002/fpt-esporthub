"use client";

import { Progress } from "@/components/ui/progress";
import { useRiotMessages, type RiotMessageKey } from "../messages";
import { roleKey } from "../format";
import type { LolChampionSummary, LolRankedEntry, LolRoleShare, PublicLolStats } from "../types";
import { ChampionIcon, MatchList } from "./match-list";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function RankedTile({ label, entry }: { label: RiotMessageKey; entry: LolRankedEntry | null }) {
  const { t } = useRiotMessages();
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{t(label)}</p>
      {entry ? (
        <>
          <p className="mt-1 font-semibold">
            {entry.division ? `${entry.tier} ${entry.division}` : entry.tier}
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">{entry.leaguePoints} LP</span>
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("winLoss", { wins: entry.wins, losses: entry.losses })} · {t("winrateValue", { value: entry.winrate })}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{t("unranked")}</p>
      )}
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>}
    </div>
  );
}

function RecentPerformance({ recent }: { recent: NonNullable<PublicLolStats["recent"]> }) {
  const { t } = useRiotMessages();
  return (
    <Section title={t("recentTitle", { count: recent.games })}>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t("winrate")} value={`${recent.winrate}%`} hint={t("winLoss", { wins: recent.wins, losses: recent.games - recent.wins })} />
        <StatTile label={t("kda")} value={recent.kda.toFixed(2)} hint={`${recent.avgKills}/${recent.avgDeaths}/${recent.avgAssists}`} />
        <StatTile label={t("csPerMin")} value={recent.csPerMin.toFixed(1)} />
      </div>
    </Section>
  );
}

function TopChampions({ champions, version }: { champions: LolChampionSummary[]; version: string | null }) {
  const { t } = useRiotMessages();
  return (
    <Section title={t("topChampions")}>
      <ul className="flex flex-col gap-2">
        {champions.map((champion) => (
          <li key={champion.championId} className="flex items-center gap-3">
            <ChampionIcon version={version} name={champion.championName} size={36} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{champion.championName}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{t("gamesCount", { count: champion.games })}</span>
            <span className="w-16 text-right text-sm tabular-nums">{t("winrateValue", { value: champion.winrate })}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function RoleBars({ roles }: { roles: LolRoleShare[] }) {
  const { t } = useRiotMessages();
  return (
    <Section title={t("roles")}>
      <ul className="flex flex-col gap-2">
        {roles.map((role) => {
          const key = roleKey(role.role);
          return (
            <li key={role.role} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="truncate">{key ? t(key) : role.role}</span>
              <Progress value={role.share} aria-label={key ? t(key) : role.role} />
              <span className="text-right text-xs text-muted-foreground tabular-nums">{role.share}%</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** Stats body shared by own and public cards. Roles only exist on own stats. */
export function LolStatsView({
  stats,
  version,
  roles,
}: {
  stats: PublicLolStats;
  version: string | null;
  roles?: LolRoleShare[];
}) {
  const { t } = useRiotMessages();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <RankedTile label="rankedSolo" entry={stats.ranked.solo} />
        <RankedTile label="rankedFlex" entry={stats.ranked.flex} />
      </div>
      {stats.recent && <RecentPerformance recent={stats.recent} />}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {stats.topChampions.length > 0 && <TopChampions champions={stats.topChampions} version={version} />}
        {roles && roles.length > 0 && <RoleBars roles={roles} />}
      </div>
      <Section title={t("matchesTitle")}>
        <MatchList matches={stats.matches} version={version} />
      </Section>
    </div>
  );
}
