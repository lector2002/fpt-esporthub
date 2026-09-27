"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import type { RiotMessageKey } from "./messages";

const DDRAGON = "https://ddragon.leagueoflegends.com";
/** match-v5 champion names that differ from the Data Dragon image key. */
const CHAMPION_KEY_FIXES: Record<string, string> = { FiddleSticks: "Fiddlesticks" };
const KNOWN_QUEUES = new Set([400, 420, 430, 440, 450, 490, 1700]);
const KNOWN_ROLES = new Set(["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"]);
/** Must match ICON_NOT_CHANGED in apps/api/src/modules/riot/riot.service.ts. */
const ICON_NOT_CHANGED = "Icon not changed yet";

/** Same rule as the API: `GameName#TAG`. */
export const RIOT_ID_PATTERN = /^[^#]{3,16}#[A-Za-z0-9]{3,5}$/;

export function profileIconUrl(version: string, iconId: number) {
  return `${DDRAGON}/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function championImageUrl(version: string, championName: string) {
  const key = CHAMPION_KEY_FIXES[championName] ?? championName;
  return `${DDRAGON}/cdn/${version}/img/champion/${encodeURIComponent(key)}.png`;
}

export function queueKey(queueId: number): RiotMessageKey {
  return KNOWN_QUEUES.has(queueId) ? (`queue_${queueId}` as RiotMessageKey) : "queue_other";
}

export function roleKey(role: string): RiotMessageKey | null {
  return KNOWN_ROLES.has(role) ? (`role_${role}` as RiotMessageKey) : null;
}

/** "28:05" from seconds. */
export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelativeTime(iso: string, language: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "minute");
}

/** Current time that re-renders the caller every `intervalMs`. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Localized toast text for a failed Riot call. */
export function riotErrorKey(error: unknown): RiotMessageKey {
  if (!(error instanceof ApiError)) return "errGeneric";
  if (error.status === 409 && error.message === ICON_NOT_CHANGED) return "errIconNotChanged";
  if (error.status === 410) return "errExpired";
  if (error.status === 429) return "errCooldown";
  if (error.status === 404) return "errNotFound";
  if (error.status === 502 || error.status === 503) return "errUnavailable";
  return "errGeneric";
}

/** Toast description: raw server text only where no localized key applies (e.g. account already claimed). */
export function riotErrorText(error: unknown, t: (key: RiotMessageKey) => string) {
  const key = riotErrorKey(error);
  if (key === "errGeneric" && error instanceof ApiError && error.status > 0) return error.message;
  return t(key);
}
