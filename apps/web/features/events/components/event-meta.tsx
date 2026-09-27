"use client";

import { CalendarDays, Clock, Swords, Trophy, Users } from "lucide-react";
import { formatDateTime, formatRelative } from "../format";
import { useEventMessages } from "../messages";
import type { EventSummary } from "../types";

/** Start date, registration deadline (with countdown while open) and interest count. */
export function EventMeta({ event }: { event: EventSummary }) {
  const { t, language } = useEventMessages();
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
      <li className="flex items-center gap-2">
        <CalendarDays className="size-4 shrink-0" aria-hidden />
        <span>
          {t("startsAt")}: <span className="text-foreground">{formatDateTime(event.startsAt, language)}</span>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <Clock className="size-4 shrink-0" aria-hidden />
        {event.registrationOpen ? (
          <span>
            <span className="text-warning">{t("closesIn", { relative: formatRelative(event.deadlineAt, language) })}</span>
            {" · "}
            {formatDateTime(event.deadlineAt, language)}
          </span>
        ) : (
          <span>{t("registrationClosed")}</span>
        )}
      </li>
      {(event.teamSize || event.format) && (
        <li className="flex items-center gap-2">
          <Swords className="size-4 shrink-0" aria-hidden />
          <span className="text-foreground">
            {[event.teamSize && (event.teamSize === 1 ? t("teamSizeSolo") : t("teamSize", { count: event.teamSize })), event.format].filter(Boolean).join(" · ")}
          </span>
        </li>
      )}
      {event.prize && (
        <li className="flex items-center gap-2">
          <Trophy className="size-4 shrink-0" aria-hidden />
          <span className="text-foreground">{event.prize}</span>
        </li>
      )}
      <li className="flex items-center gap-2">
        <Users className="size-4 shrink-0" aria-hidden />
        <span>{t("interestedCount", { count: event.interestedCount })}</span>
      </li>
    </ul>
  );
}
