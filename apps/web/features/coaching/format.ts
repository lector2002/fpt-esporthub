import type { Language } from "@/lib/i18n";

const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function formatVnd(value: number) {
  return vnd.format(value);
}

export function formatDateTime(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function formatShortDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}

/** Local `YYYY-MM-DDTHH:mm` for a datetime-local input (toISOString would shift to UTC). */
export function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function priceFor(hourlyRate: number, durationMinutes: number) {
  return Math.round((hourlyRate * durationMinutes) / 60);
}

export const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 210, 240];
export const MAX_SESSION_PRICE = 20_000_000;
export const MAX_HOURLY_RATE = 5_000_000;
