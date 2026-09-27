"use client";

import { CalendarClock, Coins, MapPin, Swords, Trophy, Users } from "lucide-react";
import { formatDateTime } from "@/features/events/format";
import { formatVnd } from "../format";
import { useOfflineMessages } from "../messages";
import type { OfflineTournament } from "../types";

export function TournamentMeta({ tournament, compact = false }: { tournament: OfflineTournament; compact?: boolean }) {
  const { t, language } = useOfflineMessages();
  const rows = [
    { icon: CalendarClock, label: t("startsAt"), value: formatDateTime(tournament.startsAt, language) },
    { icon: MapPin, label: t("venue"), value: `${tournament.venue.name} · ${compact ? tournament.venue.city : tournament.venue.address}` },
    {
      icon: Swords,
      label: t("format"),
      value: `${t(`format_${tournament.format}`)} · ${t("matchRules", { bestOf: tournament.bestOf, finalBestOf: tournament.finalBestOf })}`,
    },
    { icon: Users, label: t("teamSize", { count: tournament.teamSize }), value: t("teamsCount", { count: tournament.entryCount, max: tournament.maxTeams }) },
    {
      icon: Coins,
      label: t("entryFee"),
      value: tournament.entryFee === 0 ? t("free") : `${t("feePerTeam", { amount: formatVnd(tournament.entryFee, language) })} · ${t("payAtCounter")}`,
    },
    ...(tournament.prize && !compact ? [{ icon: Trophy, label: t("prize"), value: tournament.prize }] : []),
  ];

  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <dt className="sr-only">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
