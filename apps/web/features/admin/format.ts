import type { GameEnum, GameSlug } from "@/lib/contracts";
import { gameSlug } from "@/lib/contracts";
import type { ReportStatus, UserStatus } from "./types";

export function formatDate(value: string, language: "vi" | "en", withTime = false) {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

export function formatNumber(value: number, language: "vi" | "en") {
  return new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US").format(value);
}

/** Below `sm`, admin tables become stacked rows: no header, first cell full width, last cell (actions) pushed right. */
export const STACK_ON_PHONE =
  "max-sm:block max-sm:[&_tbody]:block max-sm:[&_thead]:hidden max-sm:[&_tr]:flex max-sm:[&_tr]:flex-wrap max-sm:[&_tr]:items-center max-sm:[&_tr]:gap-x-3 max-sm:[&_tr]:gap-y-1.5 max-sm:[&_tr]:py-3 max-sm:[&_td]:p-0 max-sm:[&_td]:whitespace-normal max-sm:[&_td:first-child]:basis-full max-sm:[&_td:last-child]:ml-auto";

export const USER_STATUS_TONE: Record<UserStatus, string> = {
  ACTIVE: "text-success",
  WARNED: "text-warning",
  RESTRICTED: "text-warning",
  BANNED: "text-destructive",
};

export const REPORT_STATUS_TONE: Record<ReportStatus, string> = {
  PENDING: "text-warning",
  REVIEWING: "text-primary",
  RESOLVED: "text-success",
  DISMISSED: "text-muted-foreground",
};

/** The tournaments API may return the Prisma enum or the slug. */
export function toSlug(game: GameEnum | GameSlug): GameSlug {
  return game === "VALORANT" || game === "LEAGUE_OF_LEGENDS" ? gameSlug(game) : game;
}
