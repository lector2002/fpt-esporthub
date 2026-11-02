export const DAY_MS = 24 * 60 * 60 * 1000;
/** Days are counted in Vietnam time (UTC+7, no DST), so "today" matches what the admin sees. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function vnDayKey(date: Date) {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of the Vietnam day `daysAgo` days before today, as a UTC instant. */
export function vnDayStart(daysAgo: number) {
  const today = vnDayKey(new Date());
  return new Date(Date.parse(`${today}T00:00:00Z`) - VN_OFFSET_MS - daysAgo * DAY_MS);
}

/** The `days` Vietnam day keys from `since` on, oldest first. */
export function vnDays(since: Date, days: number) {
  return Array.from({ length: days }, (_, index) => vnDayKey(new Date(since.getTime() + index * DAY_MS)));
}

/** Key of a `date_trunc('day', col + interval '7 hours')` value from Postgres. */
export const sqlDayKey = (day: Date) => day.toISOString().slice(0, 10);
