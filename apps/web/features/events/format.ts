import type { Language } from "@/lib/i18n";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

function locale(language: Language) {
  return language === "vi" ? "vi-VN" : "en-US";
}

/** "in 3 days" / "3 ngày nữa", relative to now. */
export function formatRelative(iso: string, language: Language) {
  const diff = new Date(iso).getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(locale(language), { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return formatter.format(Math.round(diff / size), unit);
  }
  return formatter.format(Math.round(diff / 60_000), "minute");
}

export function formatDateTime(iso: string, language: Language) {
  return new Intl.DateTimeFormat(locale(language), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
