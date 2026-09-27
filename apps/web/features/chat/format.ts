import type { Language } from "@/lib/i18n";

const locale = (language: Language) => (language === "vi" ? "vi-VN" : "en-US");

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago" style label from a real timestamp. */
export function formatRelative(iso: string, language: Language, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(locale(language), { numeric: "auto", style: "narrow" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit);
  }
  return format.format(0, "second");
}

/** Time for today, date + time otherwise. */
export function formatMessageTime(iso: string, language: Language) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(locale(language), sameDay ? { timeStyle: "short" } : { dateStyle: "short", timeStyle: "short" }).format(date);
}
